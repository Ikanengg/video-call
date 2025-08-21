import React, { useRef, useState, useEffect } from "react";
import "./Camera.css";
import { supabase } from "./supabaseClient";

const CameraComponent = () => {
  const videoRef = useRef(null);           // Local video element
  const remoteVideoRef = useRef(null);     // Remote video element
  const pc = useRef(null);                 // RTCPeerConnection
  const addedRemoteCandidates = useRef(new Set()); // Dedup remote ICE

  const [callId, setCallId] = useState(null);      // Current call id
  const [joinCallId, setJoinCallId] = useState(""); // To join an existing call
  const [isCaller, setIsCaller] = useState(false);  // Role

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [stream, setStream] = useState(null);

  // ---- ICE servers: STUN + TURN----
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


  // ---------- PeerConnection setup ----------
  useEffect(() => {
    console.log("[PC] Creating RTCPeerConnection");
    pc.current = new RTCPeerConnection(configuration);

    pc.current.ontrack = (event) => {
      console.log("[PC] Remote track received:", event.track?.kind, event.streams);
      if (remoteVideoRef.current && event.streams && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.current.onconnectionstatechange = () => {
      console.log("[PC] connectionState:", pc.current.connectionState);
    };

    pc.current.onicegatheringstatechange = () => {
      console.log("[PC] iceGatheringState:", pc.current.iceGatheringState);
    };

    pc.current.onicecandidate = async (event) => {
      if (!event.candidate) {
        console.log("[ICE] Gathering complete (null candidate)");
        return;
      }
      if (!callId) {
        console.log("[ICE] Candidate ready but no callId yet — skipping for now");
        return;
      }

      const iceKey = isCaller ? "caller_ice" : "callee_ice";
      console.log(`[ICE] New local candidate (${iceKey}):`, event.candidate);

      // Fetch current array to append to
      const { data, error } = await supabase
        .from("calls")
        .select(iceKey)
        .eq("id", callId)
        .single();

      if (error) {
        console.error("[ICE] Error fetching current ICE array:", error);
        return;
      }

      const current = Array.isArray(data?.[iceKey]) ? data[iceKey] : [];
      // Store ICE candidate as plain object (JSON) — PostgREST friendly
      const newCand = event.candidate.toJSON();
      const updated = [...current, newCand];

      const { error: updateError } = await supabase
        .from("calls")
        .update({ [iceKey]: updated })
        .eq("id", callId);

      if (updateError) {
        console.error("[ICE] Error updating ICE array:", updateError);
      } else {
        console.log(`[ICE] Stored ${iceKey} candidate. Total now: ${updated.length}`);
      }
    };

    return () => {
      console.log("[PC] Closing RTCPeerConnection");
      if (pc.current) {
        pc.current.close();
        pc.current = null;
      }
    };
    // Recreate PC if role changes (affects which ICE array we write to)
  }, [isCaller]);

  // ---------- Supabase realtime subscription ----------
  useEffect(() => {
    if (!callId) return;

    console.log("[RT] Subscribing to changes for call:", callId);
    const channel = supabase
      .channel("public:calls")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "calls", filter: `id=eq.${callId}` },
        async (payload) => {
          const callData = payload.new;
          // Caller receives Answer
          if (isCaller && callData.answer && !pc.current.remoteDescription) {
            console.log("[RT] Answer received. Setting remote description.");
            await pc.current.setRemoteDescription(
              new RTCSessionDescription({ type: "answer", sdp: callData.answer })
            );
            console.log("[RT] Remote description set (answer).");
          }

          // Add new remote ICE candidates
          const remoteIceKey = isCaller ? "callee_ice" : "caller_ice";
          const list = Array.isArray(callData[remoteIceKey]) ? callData[remoteIceKey] : [];

          for (const cand of list) {
            const key = JSON.stringify(cand);
            if (addedRemoteCandidates.current.has(key)) continue;
            try {
              await pc.current.addIceCandidate(cand);
              addedRemoteCandidates.current.add(key);
              console.log("[RT] Added remote ICE candidate");
            } catch (e) {
              console.error("[RT] Error adding remote candidate:", e);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("[RT] Channel status:", status);
      });

    return () => {
      console.log("[RT] Unsubscribing channel for call:", callId);
      supabase.removeChannel(channel);
    };
  }, [callId, isCaller]);

  // ---------- Camera ----------
  const startCamera = async () => {
    try {
      console.log("[CAM] Requesting media");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true, // include audio for real calls
      });

      
      mediaStream.getTracks().forEach((track) => {
        pc.current.addTrack(track, mediaStream);
        console.log("[CAM] Added local track:", track.kind);
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setIsCameraOn(true);
      console.log("[CAM] Local preview set");
    } catch (err) {
      console.error("[CAM] getUserMedia error:", err);
      alert("Unable to access camera/mic. Check permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      console.log("[CAM] Stopping local tracks");
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
      setIsCameraOn(false);
    }
  };

  // ---------- Caller: Create call ----------
  const createCall = async () => {
    try {
      if (!isCameraOn) {
        alert("Start your camera first.");
        return;
      }
      setIsCaller(true);

      console.log("[CALLER] Creating offer…");
      const offer = await pc.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.current.setLocalDescription(offer);
      console.log("[CALLER] Local description set (offer).");

      const { data, error } = await supabase
        .from("calls")
        .insert([{ offer: offer.sdp, answer: null, caller_ice: [], callee_ice: [] }])
        .select("*")
        .single();

      if (error) {
        console.error("[CALLER] Error creating call row:", error);
        return;
      }

      setCallId(data.id);
      console.log("[CALLER] Call created with ID:", data.id);
    } catch (e) {
      console.error("[CALLER] Error in createCall:", e);
    }
  };

  // ---------- Callee: Join call ----------
  const joinCall = async () => {
    try {
      console.log("[CALLEE] Join call started");
      if (!joinCallId) {
        alert("Please enter a call ID");
        return;
      }
      if (!isCameraOn) {
        alert("Start your camera first.");
        return;
      }

      setIsCaller(false);
      console.log("[CALLEE] Fetching call:", joinCallId);

      const { data: callData, error } = await supabase
        .from("calls")
        .select("id, offer, caller_ice, callee_ice, answer")
        .eq("id", joinCallId)
        .single();

      if (error || !callData) {
        console.error("[CALLEE] Call not found:", error);
        alert("Call ID not found");
        return;
      }

      console.log("[CALLEE] Call data:", callData);
      setCallId(joinCallId);

      // Set remote offer
      await pc.current.setRemoteDescription(
        new RTCSessionDescription({ type: "offer", sdp: callData.offer })
      );
      console.log("[CALLEE] Remote description set (offer).");

      // Create & set local answer
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);
      console.log("[CALLEE] Local description set (answer).");

      // Persist answer
      const { error: updateError } = await supabase
        .from("calls")
        .update({ answer: answer.sdp })
        .eq("id", joinCallId);

      if (updateError) {
        console.error("[CALLEE] Error saving answer:", updateError);
      } else {
        console.log("[CALLEE] Answer saved to DB.");
      }
    } catch (e) {
      console.error("[CALLEE] Error in joinCall:", e);
    }
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
          <input
            type="text"
            placeholder="Enter call ID"
            value={joinCallId}
            onChange={(e) => setJoinCallId(e.target.value)}
          />
          <button onClick={joinCall}>Join Call</button>
        </div>
      )}

      {callId && (
        <div className="call-id-display">
          <p>
            <strong>Call ID:</strong> {callId}
          </p>
          <button onClick={() => navigator.clipboard.writeText(callId)}>Copy Call ID</button>
        </div>
      )}
    </div>
  );
};

export default CameraComponent;
