import React, { useEffect, useRef } from 'react';
import './VideoCall.css';

const JitsiMeetComponent = () => {
    // The ref will hold the DOM element where Jitsi will be mounted.
    const jaasContainerRef = useRef(null);

    useEffect(() => {
        // This function will run once the component is mounted.
        const domain = '8x8.vc';
        const options = {
            roomName: 'vpaas-magic-cookie-a98c0fdfae0b455980229a4666262621/SampleAppGentleDropsSueConsistently',
            parentNode: jaasContainerRef.current,
        };

        // Dynamically load the Jitsi Meet API script.
        const script = document.createElement('script');
        script.src = `https://${domain}/external_api.js`;
        script.async = true;
        script.onload = () => {
            // Once the script is loaded, initialize the Jitsi API.
            if (window.JitsiMeetExternalAPI) {
                const api = new window.JitsiMeetExternalAPI(domain, options);
                console.log('Jitsi Meet API initialized successfully.');
            } else {
                console.error('JitsiMeetExternalAPI not found. Make sure the script loaded correctly.');
            }
        };

        document.body.appendChild(script);

        // Cleanup function: This runs when the component unmounts.
        return () => {
            // Remove the script to prevent memory leaks.
            document.body.removeChild(script);
        };
    }, []); // The empty dependency array ensures this effect runs only once.

    return (
        <div 
            id="jaas-container" 
            ref={jaasContainerRef} 
            
        />
    );
};

export default JitsiMeetComponent;