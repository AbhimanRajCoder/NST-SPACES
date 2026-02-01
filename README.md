# 🚀 NST Spaces

> **Find empty classrooms instantly. No login required.**

![NST Spaces Banner](public/nstspaces.png)

NST Spaces is a modern, intelligent room finding utility designed for the ADYPU campus. It simplifies the process of finding available spaces for study sessions, meetings, or quiet time by parsing official schedule PDFs and providing real-time availability status.

---

## ✨ Features

### 🔍 Smart Room Discovery
- **Free Now**: One-tap access to currently available rooms with live status indicators.
- **Custom Search**: Filter by day, time, and duration to plan ahead.
- **Visual Indicators**: Color-coded duration legends (Long Session, Study Session, Meeting, Quick Use).

### 📅 Intelligent Scheduling
- **Active Week Awareness**: The system respects the current academic week configuration.
- **Date-Conscious**: Automatically detects if the current date is within the active schedule, hiding irrelevant data if not.
- **Holiday/Weekend Handling**: Smart alerts for weekends and outside operating hours.

### 🎨 Premium UI/UX
- **Modern Aesthetics**: Built with **Aceternity UI** components like Spotlight and Moving Borders.
- **Dark Mode Native**: Sleek, eye-friendly dark interface with glassmorphism effects.
- **Responsive Design**: Flawless experience on mobile, tablet, and desktop.

### 🛠️ Powerful Admin Panel
- **PDF Parsing**: Upload raw timetable PDFs, and the system automatically extracts schedule data.
- **Week Configuration**: Easy-to-use date picker to set the active academic week.
- **Secure Access**: Protected admin routes for data management.

---

## 🏗️ Tech Stack

This project is built with a cutting-edge stack focused on performance and developer experience:

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **UI Components**: [Aceternity UI](https://ui.aceternity.com/), [Radix UI](https://www.radix-ui.com/), [Lucide Icons](https://lucide.dev/)
- **Backend/DB**: [Supabase](https://supabase.com/)
- **Utilities**: `date-fns` for robust date handling, `pdfjs-dist` for PDF processing.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/nst-spaces.git
    cd nst-spaces
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables**
    Create a `.env.local` file in the root directory:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run the development server**
    ```bash
    npm run dev
    ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## ❤️ Credits

Designed and developed with love by **Abhiman Raj**.

&copy; 2026 NST Spaces. All rights reserved.
