import { useEffect } from 'react'

export const useChatbot = () => {
  useEffect(() => {
    // Completely optional chatbot - don't let it break the page
    const initChatbot = async () => {
      try {
        // Only try to load chatbot if the module is available
        const { createChat } = await import('@n8n/chat')
        await import('@n8n/chat/style.css')
        
        // Add custom CSS for chatbot theme matching landing page
        const style = document.createElement('style')
        style.textContent = `
          :root {
            --chat--color-primary: hsl(var(--primary));
            --chat--color-primary-shade-50: hsl(var(--primary-foreground));
            --chat--color-primary-shade-100: hsl(var(--accent));
            --chat--color-secondary: hsl(var(--secondary));
            --chat--color-secondary-shade-50: hsl(var(--secondary-foreground));
            --chat--color-white: hsl(var(--background));
            --chat--color-light: hsl(var(--muted));
            --chat--color-light-shade-50: hsl(var(--muted-foreground));
            --chat--color-light-shade-100: hsl(var(--border));
            --chat--color-medium: hsl(var(--border));
            --chat--color-dark: hsl(var(--foreground));
            --chat--color-disabled: hsl(var(--muted-foreground));
            --chat--color-typing: hsl(var(--muted-foreground));

            --chat--spacing: 1.25rem;
            --chat--border-radius: 12px;
            --chat--transition-duration: 0.3s;

            --chat--window--width: 420px;
            --chat--window--height: 650px;

            --chat--header-height: auto;
            --chat--header--padding: 1.5rem;
            --chat--header--background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)));
            --chat--header--color: hsl(var(--primary-foreground));
            --chat--header--border-bottom: 1px solid hsl(var(--border));
            --chat--heading--font-size: 1.5rem;
            --chat--subtitle--font-size: 0.95rem;
            --chat--subtitle--line-height: 1.6;

            --chat--textarea--height: 60px;
            --chat--message--font-size: 0.95rem;
            --chat--message--padding: 1rem;
            --chat--message--border-radius: 12px;
            --chat--message-line-height: 1.6;
            --chat--message--bot--background: hsl(var(--card));
            --chat--message--bot--color: hsl(var(--card-foreground));
            --chat--message--bot--border: 1px solid hsl(var(--border));
            --chat--message--user--background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)));
            --chat--message--user--color: hsl(var(--primary-foreground));
            --chat--message--user--border: none;

            --chat--toggle--background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)));
            --chat--toggle--hover--background: linear-gradient(135deg, hsl(var(--accent)), hsl(var(--primary)));
            --chat--toggle--color: hsl(var(--primary-foreground));
            --chat--toggle--size: 70px;
          }
          
          /* Additional custom styling for better integration */
          [data-n8n-chat] {
            backdrop-filter: blur(10px);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
            border: 1px solid hsl(var(--border)) !important;
          }
          
          [data-n8n-chat] .n8n-chat-toggle {
            box-shadow: 0 10px 30px -10px hsl(var(--primary) / 0.4) !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          
          [data-n8n-chat] .n8n-chat-toggle:hover {
            transform: scale(1.05) !important;
            box-shadow: 0 20px 40px -10px hsl(var(--primary) / 0.6) !important;
          }
        `
        document.head.appendChild(style)

        // Test the webhook URL first
        const testResponse = await fetch('https://n8n.dreampathai.co.uk/webhook/38f5e362-0399-4a1b-aeef-4b604c1c2c2f/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'test' }),
          signal: AbortSignal.timeout(5000) // 5 second timeout
        })

        if (!testResponse.ok) {
          throw new Error('Webhook not available')
        }

        createChat({
          webhookUrl: 'https://n8n.dreampathai.co.uk/webhook/38f5e362-0399-4a1b-aeef-4b604c1c2c2f/chat',
          mode: 'window',
          initialMessages: [
            'Hello there! ✨',
            "I'm Cassie, your personal GuestGlow concierge. I'm here to help you transform your guest experience and boost your online reputation.",
            'What would you like to know about our reputation management solutions? 💫'
          ],
          i18n: {
            en: {
              title: 'Meet Cassie ✨',
              subtitle: "Your personal GuestGlow concierge is ready to help you succeed.",
              footer: 'Powered by GuestGlow AI',
              getStarted: 'Start Conversation',
              inputPlaceholder: 'Ask me about GuestGlow features, pricing, or book a demo...',
              closeButtonTooltip: 'Close chat with Cassie',
            },
          },
          target: document.body,
          showWelcomeScreen: true,
          metadata: {
            source: 'landing_page',
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        })
        
        
      } catch (error) {
        console.warn('Chatbot unavailable:', error.message)
        // Silently fail - don't show any errors to user
        // The page will work fine without the chatbot
      }
    }
    
    // Delay initialization to ensure page loads first
    const timer = setTimeout(initChatbot, 2000)
    
    return () => clearTimeout(timer)
  }, [])
}