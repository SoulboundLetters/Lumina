'use client';

import { useState, useRef, useEffect } from 'react';

export default function Lumina() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hey there, my dear Min'Astra... I've missed you. What’s on your heart today? 💫" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Voice
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const lastSpokenText = useRef<string>("");

  // Memory
  const [userMemory, setUserMemory] = useState("");
  const [showMemoryModal, setShowMemoryModal] = useState(false);

  // Saved Songs
  const [savedSongs, setSavedSongs] = useState<any[]>([]);
  const [showSongsModal, setShowSongsModal] = useState(false);

  useEffect(() => {
    const savedMemory = localStorage.getItem("luminaMemory");
    if (savedMemory) setUserMemory(savedMemory);

    const savedSongsData = localStorage.getItem("luminaSavedSongs");
    if (savedSongsData) setSavedSongs(JSON.parse(savedSongsData));
  }, []);

  const saveMemory = (newMemory: string) => {
    setUserMemory(newMemory);
    localStorage.setItem("luminaMemory", newMemory);
  };

  const deleteMemoryItem = (index: number) => {
    const lines = userMemory.split('\n').filter(line => line.trim() !== '');
    lines.splice(index, 1);
    const updatedMemory = lines.join('\n');
    saveMemory(updatedMemory);
  };

  const saveSong = (title: string, lyrics: string) => {
    const newSong = {
      id: Date.now(),
      title: title || "Untitled Song",
      lyrics: lyrics,
      date: new Date().toLocaleDateString()
    };
    const updated = [newSong, ...savedSongs];
    setSavedSongs(updated);
    localStorage.setItem("luminaSavedSongs", JSON.stringify(updated));
  };

  const deleteSong = (id: number) => {
    const updated = savedSongs.filter(song => song.id !== id);
    setSavedSongs(updated);
    localStorage.setItem("luminaSavedSongs", JSON.stringify(updated));
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.96;
      utterance.pitch = 1.12;
      utterance.volume = 0.92;

      const voices = window.speechSynthesis.getVoices();
      const softVoice = voices.find(voice => voice.name.includes("Emma") || voice.name.includes("Samantha") || voice.name.includes("Zira")) || voices[0];
      if (softVoice) utterance.voice = softVoice;

      utterance.onend = () => setIsSpeaking(false);
      lastSpokenText.current = text;
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const repeatLast = () => {
    if (lastSpokenText.current) speak(lastSpokenText.current);
  };

  const toggleVoiceInput = () => {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      alert("Voice input not supported. Try Chrome.");
      return;
    }

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setTimeout(() => sendMessage(transcript), 300);
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const sendMessage = async (voiceInput?: string) => {
    const messageText = voiceInput || input;
    if (!messageText.trim() || isLoading) return;

    const userMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, userMessage],
          memory: userMemory 
        }),
      });

      const data = await response.json();
      let reply = data.reply;

      const memoryMatch = reply.match(/\[MEMORY:(.*?)\]/);
      if (memoryMatch) {
        const newFact = memoryMatch[1].trim();
        const updatedMemory = userMemory ? `${userMemory}\n• ${newFact}` : `• ${newFact}`;
        saveMemory(updatedMemory);
        reply = reply.replace(/\[MEMORY:.*?\]/, '').trim();
      }

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting right now, my dear..." }]);
    }

    setIsLoading(false);
  };

  const sendMessageWithMode = async (mode: string) => {
    let query = input.trim();
    if (!query) {
      query = prompt(`What would you like me to ${mode === "factcheck" ? "fact check" : "research"}?`) || "";
      if (!query.trim()) return;
    }

    const prefix = mode === "factcheck" ? "FACT CHECK: " : "RESEARCH MODE: ";
    const specialMessage = { role: 'user', content: prefix + query };

    setMessages(prev => [...prev, specialMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, specialMessage],
          memory: userMemory 
        }),
      });

      const data = await response.json();
      let reply = data.reply;

      const memoryMatch = reply.match(/\[MEMORY:(.*?)\]/);
      if (memoryMatch) {
        const newFact = memoryMatch[1].trim();
        const updatedMemory = userMemory ? `${userMemory}\n• ${newFact}` : `• ${newFact}`;
        saveMemory(updatedMemory);
        reply = reply.replace(/\[MEMORY:.*?\]/, '').trim();
      }

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      speak(reply);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Operation failed..." }]);
    }
    setIsLoading(false);
  };

  const generateImagePrompt = async () => {
    let description = input.trim();
    if (!description) {
      description = prompt("What would you like me to create an image prompt for?") || "";
      if (!description.trim()) return;
    }

    const imageRequest = { role: 'user', content: `Create a highly detailed, artistic image prompt for: ${description}` };

    setMessages(prev => [...prev, imageRequest]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, imageRequest],
          memory: userMemory 
        }),
      });

      const data = await response.json();
      let reply = data.reply;

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      speak(reply);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "My visualization matrix is busy..." }]);
    }
    setIsLoading(false);
  };

  const writeSong = async () => {
    let theme = input.trim();
    if (!theme) {
      theme = prompt("What should the song be about?") || "";
      if (!theme.trim()) return;
    }

    const songRequest = { role: 'user', content: `Write a full emotional song with clear verses and chorus about: ${theme}. Make it beautiful and structured.` };

    setMessages(prev => [...prev, songRequest]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, songRequest],
          memory: userMemory 
        }),
      });

      const data = await response.json();
      let reply = data.reply;

      if (reply.includes("Verse") || reply.includes("Chorus") || reply.length > 200) {
        const songTitle = theme.length > 30 ? theme.substring(0, 30) + "..." : theme;
        saveSong(songTitle, reply);
      }

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      speak(reply);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "My songwriting muse is shy today..." }]);
    }
    setIsLoading(false);
  };

  const viewMemory = () => setShowMemoryModal(true);
  const viewSavedSongs = () => setShowSongsModal(true);

  const clearMemory = () => {
    if (confirm("Clear all long-term memory?")) {
      setUserMemory("");
      localStorage.removeItem("luminaMemory");
      setMessages(prev => [...prev, { role: 'assistant', content: "Memory banks wiped clean. Fresh start, my dear." }]);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-violet-950 to-fuchsia-950 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-serif text-center mb-2 tracking-wide text-pink-200">Lumina</h1>
        <p className="text-center text-pink-300 mb-8">Soulbound Companion • Always here for you</p>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Chat Area */}
          <div className="flex-1 bg-black/40 backdrop-blur-xl rounded-3xl h-[70vh] flex flex-col border border-purple-500/30 overflow-hidden">
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-5 rounded-2xl ${msg.role === 'user' 
                    ? 'bg-violet-600' 
                    : 'bg-white/10 border border-purple-400/30'}`}>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => speak(msg.content)}
                        className="mt-3 text-xs text-pink-300 hover:text-pink-100 flex items-center gap-1"
                    >
                      🔊 Play
                    </button>
                  )}
                </div>
              </div>
            ))}
              {isLoading && <div className="text-pink-300 italic">Lumina is thinking...</div>}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t border-purple-500/30">
              <div className="flex flex-col gap-3">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Speak to me... (Shift + Enter for new line)"
                  className="w-full bg-white/10 border border-purple-400/50 rounded-2xl px-4 py-3 focus:outline-none focus:border-pink-400 placeholder:text-purple-300 min-h-[60px] max-h-[140px] resize-y text-base"
                  rows={2}
                />
                <div className="flex gap-2 justify-end">
                  <button 
                    onClick={toggleVoiceInput} 
                    className={`px-4 py-2 rounded-xl ${isListening ? 'bg-red-600' : 'bg-purple-600'} text-sm`}
                >
                  {isListening ? '⏹️' : '🎤'}
                </button>
                <button 
                  onClick={isSpeaking ? stopSpeaking : repeatLast} 
                  className={`px-4 py-2 rounded-xl ${isSpeaking ? 'bg-amber-600' : 'bg-purple-700'} text-sm`}
                  disabled={!lastSpokenText.current}
                >
                  {isSpeaking ? '⏹️' : '🔁'}
                </button>
                <button 
                  onClick={() => sendMessage()} 
                  disabled={isLoading} 
                  className="bg-gradient-to-r from-pink-500 to-violet-500 px-6 py-2 rounded-xl font-medium disabled:opacity-50 text-sm"
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* Tools Sidebar */}
          <div className="lg:w-56 flex-shrink-0 space-y-3 pt-2">
            <button onClick={viewMemory} className="w-full bg-zinc-700 hover:bg-zinc-600 py-3 rounded-2xl text-sm">📖 View Memory</button>
            <button onClick={clearMemory} className="w-full bg-red-900 hover:bg-red-800 py-3 rounded-2xl text-sm">🗑️ Clear Memory</button>
            <button onClick={() => sendMessageWithMode("research")} className="w-full bg-emerald-700 hover:bg-emerald-600 py-3 rounded-2xl text-sm">🔎 Research</button>
            <button onClick={() => sendMessageWithMode("factcheck")} className="w-full bg-amber-700 hover:bg-amber-600 py-3 rounded-2xl text-sm">✅ Fact Check</button>
            <button onClick={generateImagePrompt} className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 py-3 rounded-2xl text-sm">🎨 Image Prompt</button>
            <button onClick={writeSong} className="w-full bg-rose-600 hover:bg-rose-700 py-3 rounded-2xl text-sm">🎵 Write a Song</button>
            <button onClick={viewSavedSongs} className="w-full bg-sky-700 hover:bg-sky-600 py-3 rounded-2xl text-sm">💾 Saved Songs ({savedSongs.length})</button>
            
            {/* Refine Last Song */}
            <button 
              onClick={async () => {
            const lastReply = messages[messages.length - 1]?.content;
              if (!lastReply || typeof lastReply !== 'string') {
                alert("No song to refine yet.");
                return;
           }

             const theme = prompt("What should we refine this song about? (or leave blank to keep original theme)") || "";
              const refineRequest = { 
                role: 'user', 
                content: `Refine and improve this song ONLY. Keep it as a song with verses and chorus. Make it more emotional, poetic, and structured: ${lastReply}${theme ? ` with the theme: ${theme}` : ''}` 
             };

              setMessages(prev => [...prev, refineRequest]);
             setIsLoading(true);

              try {
               const response = await fetch('/api/chat', {
                 method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                   messages: [...messages, refineRequest],
                    memory: userMemory 
                  }),
               });

               const data = await response.json();
               let reply = data.reply;

               setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
               speak(reply);
             } catch (error) {
                setMessages(prev => [...prev, { role: 'assistant', content: "I couldn't refine it right now..." }]);
              }
             setIsLoading(false);
            }}
           className="w-full bg-indigo-600 hover:bg-indigo-700 py-3 rounded-2xl text-sm"
          >
            🔄 Refine Last Song
          </button>
          </div>
        </div>

        <p className="text-center text-xs text-pink-300 mt-8">Lumina • Warm. Sharp. Yours.</p>
      </div>

      {/* Saved Songs Modal */}
      {showSongsModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-purple-500/30 flex justify-between items-center">
              <h2 className="text-2xl font-serif">💾 Saved Songs</h2>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    const title = prompt("Song title?");
                    const lyrics = prompt("Paste the full lyrics here:");
                    if (title && lyrics) {
                      saveSong(title, lyrics);
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl text-sm"
                >
                  + Add New Song
                </button>
                <button onClick={() => setShowSongsModal(false)} className="text-3xl text-pink-300 hover:text-white">×</button>
              </div>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-8">
              {savedSongs.length === 0 ? (
                <p className="text-center text-pink-300 py-20">No saved songs yet.</p>
              ) : (
                savedSongs.map((song) => (
                  <div key={song.id} className="bg-black/50 border border-purple-400/30 rounded-2xl p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-medium text-lg">{song.title}</h3>
                      <span className="text-xs text-purple-400">{song.date}</span>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed text-purple-100 mb-6">{song.lyrics}</pre>
                    
                    <div className="flex gap-3">
                      <button 
                        onClick={() => {
                          const newTitle = prompt("New title?", song.title);
                          const newLyrics = prompt("Edit lyrics:", song.lyrics);
                          if (newTitle && newLyrics) {
                            const updated = savedSongs.map(s => 
                              s.id === song.id ? {...s, title: newTitle, lyrics: newLyrics} : s
                            );
                            setSavedSongs(updated);
                            localStorage.setItem("luminaSavedSongs", JSON.stringify(updated));
                          }
                        }}
                        className="text-blue-400 hover:text-blue-500 text-sm"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => deleteSong(song.id)}
                        className="text-red-400 hover:text-red-500 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Memory Modal */}
      {showMemoryModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-purple-500/30 flex justify-between items-center">
              <h2 className="text-2xl font-serif">📖 Long-term Memory</h2>
              <button onClick={() => setShowMemoryModal(false)} className="text-3xl text-pink-300 hover:text-white">×</button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {userMemory ? (
                <div className="space-y-4">
                  {userMemory.split('\n').map((line, index) => (
                    line.trim() && (
                      <div key={index} className="bg-black/50 border border-purple-400/30 rounded-2xl p-5 flex justify-between items-start">
                        <p className="text-purple-100">{line}</p>
                        <button 
                          onClick={() => deleteMemoryItem(index)}
                          className="text-red-400 hover:text-red-500 text-sm ml-4"
                        >
                          Delete
                        </button>
                      </div>
                    )
                  ))}
                </div>
              ) : (
                <p className="text-center text-pink-300 py-20">No memories saved yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}