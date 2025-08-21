import React, { useRef, useState, useEffect } from "react";
import "./Camera.css";
import { supabase } from "./supabaseClient";

const CameraComponent = () => {
  const videoRef = useRef(null);              // Local video element
  const remoteVideoRef = useRef(null);        // Remote video element
  const pc = useRef(null);                    // RTCPeerConnection
  const roleRef = useRef("caller");           // "caller" | "callee" (kept in a ref so PC effect doesn't rerun)
  const addedRemoteCandidates = useRef(new Set()); // Dedup remote ICE
  const pendingLocalCandidates = useRef([]);  // Buffer local ICE until callId exists

  const [callId, setCallId] = useState(null);      // Active call id
  const [joinCallId, setJoinCallId] = useState(""); // Input for callee to join
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [stream, setStream] = useState(null);

  // ---- STUN + TURN (public TURN just for testing; swap for your paid TURN in prod) ----
  const configuration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
      {
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
      {
        urls: "turn:openrelay.metered.ca:443?transport=tcp",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
    ],
  };

  // ---------- PeerConnection: create ONCE ----------
  useEffect(() => {
    console.log("[PC] Creating RTCPeerConnection");
    pc.current = new RTCPeerConnection(configuration);

    pc.current.ontrack = (event) => {
      console.log("[PC] Remote track:", event.track?.kind, event.streams);
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

    // Buffer or store ICE candidates
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
      await saveCandidate(cand);
    };

    return () => {
      console.log("[PC] Closing RTCPeerConnection");
      pc.current?.close();
      pc.current = null;
    };
    // Empty deps → only once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When callId becomes available, flush any buffered local ICE
  useEffect(() => {
    const flush = async () => {
      if (!callId || pendingLocalCandidates.current.length === 0) return;
      console.log(
        `[ICE] Flushing ${pendingLocalCandidates.current.length} buffered candidates`
      );
      const toFlush = [...pendingLocalCandidates.current];
      pendingLocalCandidates.current = [];
      for (const cand of toFlush) {
        await saveCandidate(cand);
      }
    };
    flush();
  }, [callId]);

  // Helper to persist a local ICE candidate to the right column
  const saveCandidate = async (candJSON) => {
    const isCaller = roleRef.current === "caller";
    const iceKey = isCaller ? "caller_ice" : "callee_ice";

    const { data, error } = await supabase
      .from("calls")
      .select(iceKey)
      .eq("id", callId)
      .single();

    if (error) {
      console.error("[ICE] Fetch current ICE failed:", error);
      return;
    }

    const current = Array.isArray(data?.[iceKey]) ? data[iceKey] : [];
    const updated = [...current, candJSON];

    const { error: updateError } = await supabase
      .from("calls")
      .update({ [iceKey]: updated })
      .eq("id", callId);

    if (updateError) {
      console.error("[ICE] Update ICE failed:", updateError);
    } else {
      console.log(`[ICE] Stored ${iceKey} candidate (total ${updated.length})`);
    }
  };

  // ---------- Supabase realtime: listen for row updates and apply changes ----------
  useEffect(() => {
    if (!callId) return;

    console.log("[RT] Subscribing to updates for calls table");
    const channel = supabase
      .channel("public:calls")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "calls" },
        async (payload) => {
          const callData = payload.new;
          if (!callData || callData.id !== callId) return; // only our call

          const isCaller = roleRef.current === "caller";

          // Caller receives Answer
          if (isCaller && callData.answer && !pc.current?.remoteDescription) {
            console.log("[RT] Answer received; applying remote description");
            try {
              await pc.current.setRemoteDescription(
                new RTCSessionDescription({ type: "answer", sdp: callData.answer })
              );
              console.log("[RT] Remote description set (answer)");
            } catch (e) {
              console.error("[RT] setRemoteDescription(answer) failed:", e);
            }
          }

          // Add remote ICE candidates
          const remoteIceKey = isCaller ? "callee_ice" : "caller_ice";
          const list = Array.isArray(callData[remoteIceKey]) ? callData[remoteIceKey] : [];

          for (const cand of list) {
            const key = JSON.stringify(cand);
            if (addedRemoteCandidates.current.has(key)) continue;
            try {
              await pc.current.addIceCandidate(cand); // cand is RTCIceCandidateInit
              addedRemoteCandidates.current.add(key);
              console.log("[RT] Added remote ICE candidate");
            } catch (e) {
              console.error("[RT] addIceCandidate failed:", e);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("[RT] Channel status:", status);
      });

    return () => {
      console.log("[RT] Unsubscribing realtime channel");
      supabase.removeChannel(channel);
    };
  }, [callId]);

  // ---------- Camera ----------
  const startCamera = async () => {
    try {
      console.log("[CAM] Requesting media");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      mediaStream.getTracks().forEach((t) => {
        pc.current.addTrack(t, mediaStream);
        console.log("[CAM] Added local track:", t.kind);
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

  // ---------- Caller: create call ----------
  const createCall = async () => {
    try {
      if (!isCameraOn) {
        alert("Start your camera first.");
        return;
      }
      roleRef.current = "caller";

      console.log("[CALLER] Creating offer…");
      const offer = await pc.current.createOffer(); // unified-plan; no need for offerToReceive*
      await pc.current.setLocalDescription(offer);
      console.log("[CALLER] Local description set (offer)");

      const { data, error } = await supabase
        .from("calls")
        .insert([{ offer: offer.sdp, answer: null, caller_ice: [], callee_ice: [] }])
        .select("*")
        .single();

      if (error) {
        console.error("[CALLER] Create call row failed:", error);
        return;
      }

      setCallId(data.id);
      console.log("[CALLER] Call created with ID:", data.id);
    } catch (e) {
      console.error("[CALLER] createCall failed:", e);
    }
  };

  // ---------- Callee: join call ----------
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

      roleRef.current = "callee";
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

      // Apply remote offer
      await pc.current.setRemoteDescription(
        new RTCSessionDescription({ type: "offer", sdp: callData.offer })
      );
      console.log("[CALLEE] Remote description set (offer)");

      // Create & set local answer
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);
      console.log("[CALLEE] Local description set (answer)");

      // Persist answer
      const { error: updateError } = await supabase
        .from("calls")
        .update({ answer: answer.sdp })
        .eq("id", joinCallId);

      if (updateError) {
        console.error("[CALLEE] Saving answer failed:", updateError);
      } else {
        console.log("[CALLEE] Answer saved to DB");
      }
    } catch (e) {
      console.error("[CALLEE] joinCall failed:", e);
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
          <p><strong>Call ID:</strong> {callId}</p>
          <button onClick={() => navigator.clipboard.writeText(callId)}>Copy Call ID</button>
        </div>
      )}
    </div>
  );
};

export default CameraComponent;
