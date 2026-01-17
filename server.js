const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage (replace with database in production)
const users = new Map();
const contactMessages = [];

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Contact form endpoint
app.post('/api/contact', (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({ 
        error: 'All fields are required',
        details: 'Please provide name, email, and message'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format',
        details: 'Please provide a valid email address'
      });
    }

    // Word count validation (minimum 20 words)
    const wordCount = message.trim().split(/\s+/).filter(word => word.length > 0).length;
    if (wordCount < 20) {
      return res.status(400).json({ 
        error: 'Message too short',
        details: `Message must contain at least 20 words. Current: ${wordCount} words`
      });
    }

    // Store contact message
    const contactEntry = {
      id: Date.now(),
      name,
      email,
      message,
      timestamp: new Date().toISOString(),
      wordCount
    };

    contactMessages.push(contactEntry);

    // Log to console (in production, send email or save to database)
    console.log('New contact message received:', contactEntry);

    res.status(200).json({ 
      success: true,
      message: 'Thank you for your message. We will get back to you soon!',
      data: {
        messageId: contactEntry.id,
        wordCount: contactEntry.wordCount
      }
    });

  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: 'Something went wrong while processing your message'
    });
  }
});

// AI Assistant endpoint
app.post('/api/assistant', async (req, res) => {
  try {
    const { message, action, topic, text, history = [], userRole = 'student', relevantNotes } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ 
        error: 'Message is required',
        details: 'Please provide a message to the assistant'
      });
    }

    // Use fallback responses
    const aiResponse = generateAssistantResponse(message.toLowerCase(), userRole, action, topic, text);

    res.json({
      success: true,
      reply: aiResponse.text,
      links: aiResponse.links || [],
      provider: 'fallback'
    });

  } catch (error) {
    console.error('Assistant API error:', error);
    res.status(500).json({ 
      error: 'Failed to process request',
      details: 'The AI assistant encountered an error',
      reply: 'Sorry, I encountered an error. Please try again.'
    });
  }
});

function generateYouTubeLinks(query) {
  const searchQuery = encodeURIComponent(query || 'study tips');
  return [
    { title: `${query} - Complete Tutorial`, url: `https://www.youtube.com/results?search_query=${searchQuery}+tutorial` },
    { title: `${query} - Explained Simply`, url: `https://www.youtube.com/results?search_query=${searchQuery}+explained` },
    { title: `${query} - For Beginners`, url: `https://www.youtube.com/results?search_query=${searchQuery}+for+beginners` },
    { title: `${query} - Step by Step`, url: `https://www.youtube.com/results?search_query=${searchQuery}+step+by+step` }
  ];
}

function generateAssistantResponse(message, userRole, action, topic, text) {
  const responses = {
    study: {
      keywords: ['study', 'learn', 'topic', 'subject', 'chapter', 'notes', 'revision'],
      response: 'I can help you with your studies! 📚\n\nHere are some effective strategies:\n\n• Break down complex topics into smaller chunks\n• Use the Pomodoro technique: 25 minutes focused study + 5 minute breaks\n• Practice active recall instead of passive reading\n• Create mind maps to connect concepts\n• Teach the material to someone else\n\nWould you like specific study strategies for any subject?',
      links: [{ title: 'Effective Study Techniques', url: 'https://www.youtube.com/results?search_query=effective+study+techniques' }]
    },
    ideas: {
      keywords: ['idea', 'project', 'brainstorm', 'creative', 'innovative'],
      response: 'Great! Here are some project ideas: 💡\n\n**Web Development:**\n• Personal portfolio website\n• Task management app\n• Blog with CMS\n\n**Data Science:**\n• Analyze a dataset you\'re interested in\n• Build a prediction model\n• Create data visualizations\n\nWhich area interests you most?',
      links: [{ title: 'Project Ideas for Students', url: 'https://www.youtube.com/results?search_query=student+project+ideas' }]
    },
    default: {
      response: 'I\'m here to help with your studies! 🎓\n\n**I can assist with:**\n• Study notes and summaries\n• Project ideas and brainstorming\n• Task organization and planning\n• YouTube video recommendations\n• Study tips and motivation\n\nWhat would you like help with today?',
      links: []
    }
  };

  if (action === 'youtube' && topic) {
    return {
      text: `Here are some YouTube video suggestions for "${topic}":\n\n1. Complete tutorial and overview\n2. Step-by-step beginner guide\n3. Advanced concepts explained\n4. Practical examples and projects\n\nClick the links below to search for these videos!`,
      links: generateYouTubeLinks(topic)
    };
  }

  for (const [category, data] of Object.entries(responses)) {
    if (category !== 'default' && data.keywords && data.keywords.some(keyword => message.includes(keyword))) {
      return { text: data.response, links: data.links };
    }
  }

  return { text: responses.default.response, links: responses.default.links };
}

// Serve individual HTML files
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/tasks.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tasks.html'));
});

app.get('/notes.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'notes.html'));
});

app.get('/students.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'students.html'));
});

app.get('/reports.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reports.html'));
});

app.get('/attendance.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'attendance.html'));
});

app.get('/profile.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/assistant.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'assistant.html'));
});

app.get('/calculator.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'calculator.html'));
});

app.get('/contact.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✨ Study Tracker Server running on port ${PORT}`);
  console.log(`🌐 Access at: http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  process.exit(0);
});