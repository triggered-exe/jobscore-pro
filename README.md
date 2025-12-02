# JobScore Pro - AI-Powered LinkedIn Job Matching Extension

![JobScore Pro Logo](icon.png)

**JobScore Pro** is an AI-powered Chrome extension that helps job seekers evaluate how well their resume matches LinkedIn job postings. Using Google's Gemini AI, it provides instant match scores and actionable insights to improve your job application success rate.

## 🚀 Features

- **AI-Powered Job Matching**: Uses Google Gemini AI to compare your resume with job descriptions
- **Instant Match Scores**: Get a 1-100 score showing how well you match the job requirements
- **Actionable Insights**: Receive specific feedback on strengths and areas for improvement
- **Multiple Resume Support**: Upload and manage up to 3 different resumes
- **Seamless Integration**: Works directly on LinkedIn job pages
- **Real-time Processing**: Analyzes jobs as you browse LinkedIn

## 📋 How It Works

1. **Upload Your Resume**: Add your resume(s) in PDF format through the extension options
2. **Browse LinkedIn Jobs**: Navigate to any LinkedIn job posting
3. **Get Instant Analysis**: JobScore Pro automatically analyzes the job and your resume
4. **See Your Match Score**: View your compatibility score with detailed insights

## 🔧 Installation

### From Chrome Web Store (Coming Soon)
1. Visit the Chrome Web Store
2. Search for "JobScore Pro"
3. Click "Add to Chrome"

### Manual Installation (Developer Mode)
1. Clone this repository or download the source code
2. Open Chrome and go to `chrome://extensions`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked" and select the project folder
5. The extension will be installed and ready to use

## 📁 Project Structure

```
jobscore-pro/
├── manifest.json          # Extension configuration
├── background.js          # Background service worker
├── icon.png               # Extension icon
├── content/               # Content scripts for LinkedIn
│   ├── content.js         # Main job matching logic
│   └── content.css        # Styling for match cards
├── popup/                 # Browser action popup
│   ├── main.html          # Popup HTML
│   ├── script.js          # Popup JavaScript
│   └── style.css          # Popup styling
└── options/               # Options page
    ├── index.html         # Options HTML
    ├── script.js          # Options JavaScript
    └── style.css          # Options styling
```

## 🛠️ Configuration

### API Key Setup
The extension uses Google's Gemini AI API. You need to:

1. Get a Gemini API key from Google Cloud Console
2. Replace the placeholder in both files:
   - [`content/content.js`](content/content.js:2)
   - [`options/script.js`](options/script.js:1)

```javascript
// Replace this line in both files
const GEMINI_API_KEY = 'XXXXXXXXXXXXXXXXXXXXXXXXXX';
```

## 🎯 Usage

### Uploading Resumes
1. Click the JobScore Pro extension icon in your browser toolbar
2. Click "Manage Resumes" to open the options page
3. Upload your resume PDF files (up to 3 resumes)
4. Set one resume as your default

### Viewing Match Scores
1. Browse to any LinkedIn job posting
2. JobScore Pro will automatically analyze the job
3. A match card will appear showing:
   - Your match score (1-100)
   - Score interpretation (Excellent, Good, Moderate, Weak, or Poor)
   - Two key insights about your match

### Score Interpretation
- **90-100**: Excellent match - Strong candidate for this position
- **70-89**: Good match - Good fit with some room for improvement
- **50-69**: Moderate match - Some qualifications match, others need work
- **30-49**: Weak match - Significant gaps in qualifications
- **1-29**: Poor match - Not a good fit for this position

## 🔍 Technical Details

### Content Script
The main logic is in [`content/content.js`](content/content.js:1) which:
- Detects LinkedIn job pages using URL patterns
- Extracts job title, company, and description
- Sends resume and job data to Gemini AI
- Displays match results in a clean UI card

### AI Integration
- Uses Google Gemini Flash Lite model for quick responses
- Processes both text and PDF data
- Provides structured JSON responses with scores and insights

### Storage
- Uses Chrome's `storage.local` to store resumes
- Supports multiple resumes with default selection
- Stores resume content as parsed text for quick access

## 📝 Requirements

- Chrome browser (version 88+ recommended)
- Google Gemini API key
- LinkedIn account (for job browsing)
- Resume in PDF format

## 🚨 Limitations

- Maximum 3 resumes can be stored
- Only PDF resumes are supported
- Requires internet connection for AI processing
- Limited to LinkedIn job pages only

## 🛡️ Privacy

- Resumes are stored locally in your browser
- No personal data is sent to external servers except to Google's AI API
- API calls are made directly from your browser

## 📈 Future Enhancements

- Support for additional resume formats (DOCX, TXT)
- Customizable scoring criteria
- Job application tracking
- Interview preparation suggestions
- Salary comparison tools

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## 📜 License

This project is open source and available under the MIT License.

## 📧 Support

For issues or questions:
- Open a GitHub issue
- Check the Chrome Web Store reviews (when available)

---

**JobScore Pro** - Your AI-powered job matching assistant for LinkedIn!