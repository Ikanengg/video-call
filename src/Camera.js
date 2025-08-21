import React, { useRef, useState, useEffect } from "react";
import "./Camera.css";
import { supabase } from "./supabaseClient";

const CameraComponent = () => {
  const videoRef = useRef(null);           // Local video element
  const remoteVideoRef = useRef(null);     // Remote video element
  const pc = useRef(null);                 // RTCPeerConnection

  const pendingLocalCandidates = useRef([]); // Buffer ICE until callId exists
  const addedRemoteCandidates = useRef(new Set()); // Deduplicate remote ICE

  const roleRef = useRef(null); // "caller" or "callee"

  const [callId, setCallId] = useState(null);
  const [joinCallId, setJoinCallId] = useState("");
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [stream, setStream] = useState(null);

  const configuration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject"
      }
    ]
  };

  // ---------- RTCPeerConnection ----------
  useEffect(() => {
    console.log("[PC] Creating RTCPeerConnection");
    pc.current = new RTCPeerConnection(configuration);

    pc.current.ontrack = (event) => {
      console.log("[PC] Remote track:", event.track.kind, event.streams);
      if (remoteVideoRef.current && event.streams && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.current.onicecandidate = async (event) => {
      if (!event.candidate) {
        console.log("[ICE] Gathering complete (null candidate)");
        return;
      }

      const cand = event.candidate.toJSON();

      if (!callId) {
        console.log("[ICE] No callId yet — buffering local candidate");
        pendingLocalCandidates.current.push(cand);
        return;
      }

      const iceKey = roleRef.current === "caller" ? "caller_ice" : "callee_ice";
      const { data } = await supabase.from("calls").select(iceKey).eq("id", callId).single();
      const current = Array.isArray(data?.[iceKey]) ? data[iceKey] : [];
      await supabase.from("calls").update({ [iceKey]: [...current, cand] }).eq("id", callId);
      console.log(`[ICE] Stored ${iceKey} candidate. Total now: ${current.length + 1}`);
    };

    return () => {
      console.log("[PC] Closing RTCPeerConnection");
      if (pc.current) pc.current.close();
    };
  }, []);

  // ---------- Supabase realtime subscription ----------
  useEffect(() => {
    if (!callId) return;

    console.log("[RT] Subscribing to updates for call:", callId);
    const channel = supabase
      .channel("public:calls")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "calls", filter: `id=eq.${callId}` },
        async (payload) => {
          const callData = payload.new;

          // Caller receives Answer
          if (roleRef.current === "caller" && callData.answer && !pc.current.remoteDescription) {
            console.log("[RT] Setting remote description (answer)");
            await pc.current.setRemoteDescription({ type: "answer", sdp: callData.answer });
          }

          // Add remote ICE candidates
          const remoteIceKey = roleRef.current === "caller" ? "callee_ice" : "caller_ice";
          const list = Array.isArray(callData[remoteIceKey]) ? callData[remoteIceKey] : [];

          for (const cand of list) {
            const key = JSON.stringify(cand);
            if (addedRemoteCandidates.current.has(key)) continue;
            try {
              await pc.current.addIceCandidate(cand);
              addedRemoteCandidates.current.add(key);
              console.log("[RT] Added remote ICE candidate");
            } catch (e) {
              console.error("[RT] Error adding remote ICE candidate:", e);
            }
          }
        }
      )
      .subscribe((status) => console.log("[RT] Channel status:", status));

    return () => supabase.removeChannel(channel);
  }, [callId]);

  // ---------- Camera ----------
  const startCamera = async () => {
    try {
      console.log("[CAM] Requesting media");
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      // Set local preview
      videoRef.current.srcObject = mediaStream;
      setStream(mediaStream);
      setIsCameraOn(true);

      // ADDED: Add tracks to the RTCPeerConnection instance
      mediaStream.getTracks().forEach((track) => pc.current.addTrack(track, mediaStream));

      console.log("[CAM] Local preview set and tracks added");
    } catch (err) {
      console.error("[CAM] getUserMedia error:", err);
      alert("Unable to access camera/mic.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
      setIsCameraOn(false);
    }
  };

  // ---------- Caller ----------
  const createCall = async () => {
    if (!isCameraOn) return alert("Start your camera first.");
    roleRef.current = "caller";

    const offer = await pc.current.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
    await pc.current.setLocalDescription(offer);

    const { data } = await supabase
      .from("calls")
      .insert([{ offer: offer.sdp, answer: null, caller_ice: [], callee_ice: [] }])
      .select("*")
      .single();

    setCallId(data.id);
    console.log("[CALLER] Call created with ID:", data.id);

    // Flush any buffered candidates
    pendingLocalCandidates.current.forEach(async (cand) => {
      const { data: iceData } = await supabase.from("calls").select("caller_ice").eq("id", data.id).single();
      const current = Array.isArray(iceData?.caller_ice) ? iceData.caller_ice : [];
      await supabase.from("calls").update({ caller_ice: [...current, cand] }).eq("id", data.id);
    });
    pendingLocalCandidates.current = [];
  };

  // ---------- Callee ----------
  const joinCall = async () => {
    if (!isCameraOn) return alert("Start your camera first.");
    if (!joinCallId) return alert("Enter call ID");
    roleRef.current = "callee";

    const { data: callData } = await supabase.from("calls").select("*").eq("id", joinCallId).single();
    setCallId(joinCallId);

    // Set remote offer
    await pc.current.setRemoteDescription({ type: "offer", sdp: callData.offer });

    // Create & set answer
    const answer = await pc.current.createAnswer();
    await pc.current.setLocalDescription(answer);

    await supabase.from("calls").update({ answer: answer.sdp }).eq("id", joinCallId);

    // Flush buffered candidates
    pendingLocalCandidates.current.forEach(async (cand) => {
      const { data: iceData } = await supabase.from("calls").select("callee_ice").eq("id", joinCallId).single();
      const current = Array.isArray(iceData?.callee_ice) ? iceData.callee_ice : [];
      await supabase.from("calls").update({ callee_ice: [...current, cand] }).eq("id", joinCallId);
    });
    pendingLocalCandidates.current = [];
  };

  return (
    <div className="camera-container">
      <h2>Video Call Camera Preview</h2>
      <video ref={videoRef} autoPlay playsInline muted className="camera-preview" />
      <video ref={remoteVideoRef} autoPlay playsInline className="camera-preview" />

      <div className="camera-controls">
        {!isCameraOn ? (
          <button onClick={startCamera}>Turn Camera On</button>
        ) : (
          <>
            <button onClick={stopCamera}>Turn Camera Off</button>
            {!callId && <button onClick={createCall}>Create Call</button>}
          </>
        )}
      </div>

      {!callId && (
        <div className="join-call">
          <input type="text" placeholder="Enter call ID" value={joinCallId} onChange={(e) => setJoinCallId(e.target.value)} />
          <button onClick={joinCall}>Join Call</button>
        </div>
      )}

      {callId && (
        <div className="call-id-display">
          <p><strong>Call ID:</strong> {callId}</p>
          <button onClick={() => navigator.clipboard.writeText(callId)}>Copy Call ID</button>
        </div>
      )}
    </div>
  );
};

export default CameraComponent;