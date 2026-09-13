import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Trash2,
  Minimize2,
  Maximize2,
  ChevronDown,
  Cpu,
  ShieldCheck,
  Zap,
  HelpCircle,
  CornerDownLeft
} from 'lucide-react';
import styles from './FloatingChatWidget.module.css';

const QUICK_PROMPTS = [
  'Explain USP <621> tailing factor requirements',
  'How does Isolation Forest flag chromatographic anomalies?',
  'What causes low theoretical plates (N < 2000)?',
  'How to resolve peak co-elution and increase resolution (Rs)?',
  'Summarize chromatographic system suitability criteria'
];

const KNOWLEDGE_RESPONSES = {
  tailing: `### USP <621> Peak Symmetry & Tailing Factor ($T$)\n\nAccording to **USP <621> Chromatography Guidelines**:\n\n* **Definition:** $T = \\frac{W_{0.05}}{2f}$, measured at **5% of peak height**.\n* **Acceptance Criteria:** For most quantitative pharmaceutical assays, **$T \\le 1.50$** (ideal Gaussian peak has $T = 1.00$). In some formulations, $T \\le 1.80$ is permitted for secondary degradants.\n* **Common Root Causes of Peak Tailing ($T > 1.5$):**\n  1. **Secondary silanol interactions** with basic compounds on C18 stationary phase.\n  2. **Column void or inlet frit fouling** causing non-uniform flow profile.\n  3. **Sample solvent mismatch** (injection solvent stronger than mobile phase).\n  4. **Mass overload** exceeding column saturation limits.\n* **Corrective Action:** Add triethylamine/formic acid modifier, replace guard column, or lower injection volume.`,

  isolation_forest: `### Isolation Forest for Chromatographic Anomaly Detection\n\nNexusMind employs an **ensemble of Isolation Trees ($iTrees$)** to isolate rare anomalies rather than modeling normal profiles:\n\n1. **Feature Vector:** Each peak is represented as $\\mathbf{x} = [t_R, \\text{Area}, \\text{Height}, T, N, R_s, S/N]$.\n2. **Partitioning Depth:** Anomalous spikes (e.g., ghost peaks, co-eluted degradants, extreme tailing) have distinct multi-dimensional features and require fewer random partitions ($h(\\mathbf{x})$) to isolate.\n3. **Anomaly Score Calculation:**\n   $$s(\\mathbf{x}, n) = 2^{-\\frac{E(h(\\mathbf{x}))}{c(n)}}$$\n   * Scores close to **$1.0$ (or negative calibrated values $< -0.10$)** signify distinct anomalies.\n   * Scores $< 0.5$ indicate nominal, expected elution behavior.`,

  plates: `### Column Efficiency & Theoretical Plates ($N$)\n\n**Theoretical Plates ($N$)** measures peak dispersion across the stationary phase:\n\n* **Formula:** $N = 16 \\cdot \\left(\\frac{t_R}{W}\\right)^2 = 5.54 \\cdot \\left(\\frac{t_R}{W_{0.5}}\\right)^2$\n* **USP Acceptance Limit:** Standard HPLC columns require **$N \\ge 2,000$** (UHPLC often achieves $N > 10,000$).\n* **Why Theoretical Plates Drop ($N < 2000$):**\n  * Column degradation / stationary phase loss.\n  * Extra-column volume dispersion (long capillary tubing or oversized flow cell).\n  * Flow rate deviating from optimal **van Deemter velocity ($u_{opt}$)**.\n* **Remedy:** Perform column regeneration flushes, inspect tubing connections, and verify flow rate calibration.`,

  resolution: `### Peak Resolution ($R_s$) Optimization\n\n**Resolution ($R_s$)** defines baseline separation between adjacent chromatographic peaks:\n\n* **Formula:** $R_s = \\frac{2(t_{R2} - t_{R1})}{W_1 + W_2}$\n* **USP Baseline Criteria:** **$R_s \\ge 1.5$** ensures $\\ge 99.7\\%$ baseline separation without spectral overlap.\n* **How to Increase $R_s$ (Purnell Equation):**\n  1. **Selectivity ($\\alpha$):** Change mobile phase pH, organic modifier (e.g., switch Acetonitrile $\\leftrightarrow$ Methanol), or stationary phase chemistry.\n  2. **Efficiency ($N$):** Use smaller particle sizes (e.g., $1.8\\mu\\text{m}$ UHPLC) or increase column length.\n  3. **Retention ($k'$):** Adjust gradient slope or reduce initial organic % for earlier-eluting pairs.`,

  suitability: `### Chromatographic System Suitability Summary (USP / EP / JP)\n\nBefore running analytical sample sequences, the HPLC system must satisfy:\n\n| Parameter | Standard Acceptance Limit | NexusMind Flag |\n| :--- | :--- | :--- |\n| **Peak Tailing ($T$)** | $0.8 \\le T \\le 1.50$ | $T > 1.50$ Alert |\n| **Theoretical Plates ($N$)** | $N \\ge 2,000$ | $N < 2000$ Warning |\n| **Resolution ($R_s$)** | $R_s \\ge 1.50$ (baseline) | $R_s < 1.50$ Flag |\n| **RSD of Area (6 injections)** | $\\le 1.0\\% - 2.0\\%$ | Drift Alert |\n| **Signal-to-Noise ($S/N$)** | $\\ge 10$ (Quantitation), $\\ge 3$ (Detection) | Trace Outlier |`
};

export default function FloatingChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState('LLaMA 3.3 70B');

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: "Hello! I'm **NexusMind AI Copilot**, your analytical chemistry and chromatographic intelligence assistant.\n\nHow can I assist you with your HPLC runs, USP <621> compliance, or ML anomaly diagnostics today?",
      time: 'Just now'
    }
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  const handleSendMessage = (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsTyping(true);

    // Contextual Analytical Intelligence Generator
    setTimeout(() => {
      let botResponse = '';
      const qLower = query.toLowerCase();

      if (qLower.includes('tail') || qLower.includes('asymmetry') || qLower.includes('shape')) {
        botResponse = KNOWLEDGE_RESPONSES.tailing;
      } else if (qLower.includes('isolation') || qLower.includes('forest') || qLower.includes('anomaly') || qLower.includes('outlier')) {
        botResponse = KNOWLEDGE_RESPONSES.isolation_forest;
      } else if (qLower.includes('plate') || qLower.includes('efficiency') || qLower.includes('plates') || qLower.includes('column')) {
        botResponse = KNOWLEDGE_RESPONSES.plates;
      } else if (qLower.includes('resolution') || qLower.includes('co-elution') || qLower.includes('separate') || qLower.includes('rs')) {
        botResponse = KNOWLEDGE_RESPONSES.resolution;
      } else if (qLower.includes('suitability') || qLower.includes('compliance') || qLower.includes('usp') || qLower.includes('criteria')) {
        botResponse = KNOWLEDGE_RESPONSES.suitability;
      } else {
        botResponse = `### Analytical Intelligence Assessment\n\nRegarding: *"${query}"*\n\nBased on your active chromatographic dataset and **USP <621>** specifications:\n\n1. **Data Consistency:** The analytical pipeline processes retention times ($t_R$), area abundance, peak height, and baseline noise in real time.\n2. **Compliance Verification:** Any peak exhibiting **$T > 1.50$**, **$N < 2000$**, or an **Isolation Score $< -0.10$** is automatically flagged in your Knowledge Graph and Diagnostic Matrix.\n3. **Recommendation:** You can fine-tune hyperparameter boundaries on the **Diagnostics** page or explore multi-modal entity links on the **3D Knowledge Graph**.\n\nFeel free to ask specific questions regarding mobile phase composition, gradient slopes, or impurity identification!`;
      }

      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: botResponse,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 600);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: Date.now(),
        sender: 'bot',
        text: "Conversation cleared. Ready for your next chromatographic inquiry!",
        time: 'Just now'
      }
    ]);
  };

  return (
    <div className={styles.floatingContainer}>
      {/* 1. Floating Toggle Button (Bottom Right) */}
      {!isOpen && (
        <button
          className={styles.floatingChatBtn}
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          title="Open NexusMind AI Assistant"
        >
          <div className={styles.btnInner}>
            <div className={styles.iconPulse}>
              <Sparkles size={20} className={styles.sparkleIcon} />
            </div>
            <MessageSquare size={22} className={styles.mainChatIcon} />
            <span className={styles.chatBadge}>AI Copilot</span>
          </div>
          <span className={styles.pingRing} />
        </button>
      )}

      {/* 2. Pop-up Chat Interface */}
      {isOpen && (
        <div className={`${styles.chatPopup} ${isMinimized ? styles.popupMinimized : ''}`}>
          {/* Header */}
          <div className={styles.chatHeader}>
            <div className={styles.headerTitleGroup}>
              <div className={styles.botAvatar}>
                <Bot size={18} />
              </div>
              <div>
                <div className={styles.headerTitleRow}>
                  <span className={styles.headerTitle}>NexusMind AI Copilot</span>
                  <span className={styles.onlineDot} />
                </div>
                <div className={styles.modelTag}>
                  <Cpu size={10} />
                  <span>{selectedModel} &bull; Active</span>
                </div>
              </div>
            </div>

            <div className={styles.headerControls}>
              <button
                className={styles.headerBtn}
                onClick={handleClearChat}
                title="Clear Chat History"
              >
                <Trash2 size={14} />
              </button>
              <button
                className={styles.headerBtn}
                onClick={() => setIsMinimized((prev) => !prev)}
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
              </button>
              <button
                className={styles.headerBtn}
                onClick={() => setIsOpen(false)}
                title="Close Chat"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body (Hidden if Minimized) */}
          {!isMinimized && (
            <>
              <div className={styles.chatBody}>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`${styles.messageWrapper} ${
                      msg.sender === 'user' ? styles.userWrapper : styles.botWrapper
                    }`}
                  >
                    <div className={styles.avatarMini}>
                      {msg.sender === 'user' ? <User size={13} /> : <Bot size={13} />}
                    </div>

                    <div className={styles.messageBubble}>
                      <div className={styles.messageContent}>
                        {msg.text.split('\n\n').map((para, pIdx) => {
                          if (para.startsWith('### ')) {
                            return (
                              <div key={pIdx} className={styles.mdHeading}>
                                {para.replace('### ', '')}
                              </div>
                            );
                          }
                          if (para.startsWith('* ') || para.startsWith('- ')) {
                            const items = para.split('\n');
                            return (
                              <ul key={pIdx} className={styles.mdList}>
                                {items.map((it, iIdx) => (
                                  <li key={iIdx}>
                                    <span
                                      dangerouslySetInnerHTML={{
                                        __html: it
                                          .replace(/^[\*\-]\s+/, '')
                                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                          .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                          .replace(/`(.*?)`/g, '<code>$1</code>')
                                      }}
                                    />
                                  </li>
                                ))}
                              </ul>
                            );
                          }
                          return (
                            <p
                              key={pIdx}
                              dangerouslySetInnerHTML={{
                                __html: para
                                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                  .replace(/`(.*?)`/g, '<code>$1</code>')
                              }}
                            />
                          );
                        })}
                      </div>
                      <span className={styles.messageTime}>{msg.time}</span>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className={`${styles.messageWrapper} ${styles.botWrapper}`}>
                    <div className={styles.avatarMini}>
                      <Bot size={13} />
                    </div>
                    <div className={`${styles.messageBubble} ${styles.typingBubble}`}>
                      <div className={styles.typingDots}>
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts Ribbon */}
              <div className={styles.quickPrompts}>
                {QUICK_PROMPTS.map((qp, idx) => (
                  <button
                    key={idx}
                    className={styles.quickPromptChip}
                    onClick={() => handleSendMessage(qp)}
                  >
                    {qp}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <div className={styles.chatFooter}>
                <div className={styles.inputContainer}>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about HPLC peaks, anomalies, or USP compliance..."
                    rows={1}
                    className={styles.chatTextarea}
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!input.trim() || isTyping}
                    className={styles.sendButton}
                    title="Send Message (Enter)"
                  >
                    <Send size={15} />
                  </button>
                </div>
                <div className={styles.footerHint}>
                  <span>Press <strong>Enter</strong> to send &bull; Shift+Enter for new line</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
