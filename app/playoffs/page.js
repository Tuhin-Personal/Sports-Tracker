'use client';

import React from 'react';

// This MUST be "export default" for Next.js to recognize it as a page
export default function PlayoffsPage() {
  return (
    <div style={{ 
      padding: "40px", 
      textAlign: "center", 
      backgroundColor: "#fff", 
      color: "#000", 
      minHeight: "100vh" 
    }}>
      <h1 style={{ fontWeight: "900", fontSize: "2.5rem" }}>NFL PLAYOFF BRACKET</h1>
      <div style={{ 
        marginTop: "50px", 
        padding: "20px", 
        border: "2px dashed #ccc", 
        borderRadius: "15px",
        display: "inline-block"
      }}>
        <p style={{ fontSize: "18px", color: "#666" }}>
          Playoff data will be available as the post-season approaches.
        </p>
      </div>
    </div>
  );
}