import "./Home.css";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Brain,
  ClipboardCheck,
  BookOpen,
  Compass,
  BarChart3,
  MessageSquare,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

function Home() {
  const navigate = useNavigate();

  const handleRole = (role) => {
    navigate(`/login/${role}`);
  };

  const features = [
    {
      icon: <Brain size={24} />,
      title: "AI Personal Tutor",
      desc: "Step-by-step explanations, voice answers and instant doubt-solving.",
    },
    {
      icon: <ClipboardCheck size={24} />,
      title: "Smart Quiz Generation",
      desc: "Quizzes built automatically from your uploaded notes.",
    },
    {
      icon: <BookOpen size={24} />,
      title: "Notes Summarization",
      desc: "Convert long lectures into bullet summaries and key points.",
    },
    {
      icon: <Compass size={24} />,
      title: "AI Study Planner",
      desc: "Personalized daily and weekly schedules with reminders.",
    },
    {
      icon: <BarChart3 size={24} />,
      title: "Progress Analytics",
      desc: "Track strengths, weak areas and performance trends.",
    },
    {
      icon: <MessageSquare size={24} />,
      title: "Flashcards & Mock Interviews",
      desc: "Active recall plus technical & HR mock interviews.",
    },
  ];

  const roles = [
    {
      number: "01 · ROLE",
      title: "Student",
      desc: "Enroll, learn, get AI tutoring.",
    },
    {
      number: "02 · ROLE",
      title: "Instructor",
      desc: "Create courses, monitor learners.",
    },
    {
      number: "03 · ROLE",
      title: "Admin",
      desc: "Govern users, courses, analytics.",
    },
  ];

  return (
    <div className="home">

      {/* Navbar */}
      <nav className="navbar">
        <div className="logo">
          <div className="logo-icon">
            <GraduationCap size={18} />
          </div>

          <span>Lumina</span>
        </div>

        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#roles">For institutions</a>
          <a href="#">Demo</a>
        </div>

        <div className="nav-buttons">
          <button className="signin-btn">
            Sign in
          </button>

          <button
  className="getstarted-btn"
  onClick={() =>
    document
      .querySelector(".hero-roles")
      .scrollIntoView({ behavior: "smooth" })
  }
>
  Get started
</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">

        <div className="hero-badge">
          ✨ Now featuring AI Career Guidance & Voice Tutor
        </div>

        <h1>
          The official AI Learning
          <br />
          <span>platform</span> for modern
          <br />
          institutions.
        </h1>

        <p>
          One platform for students, instructors and admins —
          with a personal AI tutor, smart quiz generation,
          notes summarization and personalized study planning.
        </p>

        <div className="hero-roles">

  <div className="hero-role-card">
    <h3>Student</h3>
    <p>Enroll, learn and get AI tutoring.</p>

    <div className="hero-role-actions">
      <button>Login</button>
      <button className="outline">Create Account</button>
    </div>
  </div>

  <div className="hero-role-card">
    <h3>Instructor</h3>
    <p>Create courses and monitor learners.</p>

    <div className="hero-role-actions">
      <button>Login</button>
      <button className="outline">Create Account</button>
    </div>
  </div>

  <div className="hero-role-card">
    <h3>Admin</h3>
    <p>Govern users and analytics.</p>

    <div className="hero-role-actions">
      <button>Login</button>
      <button className="outline">Create Account</button>
    </div>
  </div>

</div>

        <div className="hero-info">

          <div>
            <CheckCircle size={16} />
            FERPA-aligned
          </div>

          <div>
            <CheckCircle size={16} />
            Role-based access
          </div>

          <div>
            <CheckCircle size={16} />
            Institution-ready
          </div>

        </div>
      </section>

      {/* Features */}
      <section className="features-section" id="features">

        <div className="section-heading">
          <h2>
            Everything a modern learner — and
            institution — needs.
          </h2>

          <p>
            Seventeen integrated modules across three roles,
            unified by an intelligent core.
          </p>
        </div>

        <div className="features-grid">

          {features.map((feature, index) => (
            <div className="feature-card" key={index}>

              <div className="feature-icon">
                {feature.icon}
              </div>

              <h3>{feature.title}</h3>

              <p>{feature.desc}</p>

            </div>
          ))}

        </div>

      </section>

      {/* Roles */}
      

      {/* Footer */}
      <footer className="footer">

        <div className="footer-left">
          🎓 © 2026 Lumina Education Systems.
        </div>

        <div className="footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Contact</a>
        </div>

      </footer>

    </div>
  );
}

export default Home;