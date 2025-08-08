import React, { useRef, useState, useEffect } from "react";
import './Camera.css';
import { supabase } from './supabaseClient';

const CameraComponent = () => {
  const videoRef = useRef(null);          // Local video
  const remoteVideoRef = useRef(null);    // Remote video
  const pc = useRef(null);                 // RTCPeerConnection instance

  const [callId, setCallId] = useState(null); // Current active call ID
  const [joinCallId, setJoinCallId] = useState(""); // Input for call to join
  const [isCaller, setIsCaller] = useState(false);   // Track if this device created the call

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [stream, setStream] = useState(null);

  const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  // Initialize RTCPeerConnection once when component mounts
  useEffect(() => {
    pc.current = new RTCPeerConnection(configuration);

    pc.current.ontrack = (event) => {
      console.log("Remote track received:", event);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.current.onicecandidate = async (event) => {
      if (!event.candidate || !callId) return;
      console.log("New ICE candidate:", event.candidate);

      // Determine which ICE array to update depending on caller/callee role
      const iceKey = isCaller ? "caller_ice" : "callee_ice";

      // Fetch current ICE candidates to append to
      const { data, error } = await supabase
        .from("calls")
        .select(iceKey)
        .eq("id", callId)
        .single();

      if (error) {
        console.error("Error fetching ICE candidates:", error);
        return;
      }

      // Append new candidate
      const updatedIce = data[iceKey] ? [...data[iceKey], event.candidate] : [event.candidate];

      // Update Supabase
      const { error: updateError } = await supabase
        .from("calls")
        .update({ [iceKey]: updatedIce })
        .eq("id", callId);

      if (updateError) {
        console.error("Error updating ICE candidates:", updateError);
      }
    };

    return () => {
      // Cleanup peer connection on unmount
      if (pc.current) {
        pc.current.close();
        pc.current = null;
      }
    };
  }, [callId, isCaller]);

  // Subscribe to Supabase realtime updates for call changes
  useEffect(() => {
    if (!callId) return;

    const channel = supabase
      .channel('public:calls')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `id=eq.${callId}`
        },
        async (payload) => {
          const callData = payload.new;

          // If answer arrives and remoteDescription not set (caller side)
          if (callData.answer && isCaller && !pc.current.remoteDescription) {
            console.log("Received answer SDP from callee:", callData.answer);
            await pc.current.setRemoteDescription(new RTCSessionDescription({
              type: "answer",
              sdp: callData.answer,
            }));
            console.log("Answer SDP set");
          }

          // Add ICE candidates from remote peer
          const remoteIceKey = isCaller ? "callee_ice" : "caller_ice";

          for (const candidate of callData[remoteIceKey] || []) {
            try {
              await pc.current.addIceCandidate(candidate);
              console.log("Added ICE candidate from remote peer");
            } catch (e) {
              console.error("Error adding ICE candidate:", e);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [callId, isCaller]);

  // Start camera and add stream tracks to peer connection
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      mediaStream.getTracks().forEach((track) => {
        pc.current.addTrack(track, mediaStream);
        console.log("Added local track:", track.kind);
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraOn(true);
      setStream(mediaStream);
      
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Unable to access camera. Please check permissions.");
    }
  };

  // Stop camera and stop all tracks
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsCameraOn(false);
    }
  };

  // Create call and offer (caller)
  const createCall = async () => {
    setIsCaller(true); // This device is the caller

    const offer = await pc.current.createOffer();
    console.log("Creating offer SDP:", offer);
    await pc.current.setLocalDescription(offer);
    console.log("Local description set with offer SDP");

    const { data, error } = await supabase
      .from("calls")
      .insert([
        { offer: offer.sdp, caller_ice: [], callee_ice: [] }
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating call:", error);
      return;
    }

    setCallId(data.id);
    console.log("Call created with ID:", data.id);
  };

  // Join existing call (callee)
  const joinCall = async () => {
    if (!joinCallId) {
      alert("Please enter a call ID");
      return;
    }

    setIsCaller(false); // This device is the callee

    const { data: callData, error } = await supabase
      .from("calls")
      .select("id, offer, caller_ice, callee_ice")
      .eq("id", joinCallId)
      .single();

    if (error || !callData) {
      alert("Call ID not found!");
      return;
    }

    setCallId(joinCallId);

    await pc.current.setRemoteDescription(new RTCSessionDescription({
      type: "offer",
      sdp: callData.offer,
    }));

    const answer = await pc.current.createAnswer();
    await pc.current.setLocalDescription(answer);

    const { error: updateError } = await supabase
      .from("calls")
      .update({ answer: answer.sdp })
      .eq("id", joinCallId);

    if (updateError) {
      console.error("Error saving answer SDP:", updateError);
    }
  };

  return (
    <div className="camera-container">
      <h2>Video Call Camera Preview</h2>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="camera-preview"
      ></video>

      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="camera-preview"
      ></video>

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
      {/* Display current call ID*/}
      {callId && (
        <div className="call-id-display">
          <p><strong>Call ID:</strong> {callId}</p>
          <button onClick={() => navigator.clipboard.writeText(callId)}>
            Copy Call ID
          </button>
        </div>
      )}
    </div>
  );
};

export default CameraComponent;
