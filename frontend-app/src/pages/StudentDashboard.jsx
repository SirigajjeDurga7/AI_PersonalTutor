// src/pages/StudentDashboard.jsx

import "./StudentDashboard.css";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { 
  BookOpen, FileText, Cpu, HelpCircle, Calendar, 
  Layers, Trophy, ShieldAlert, Award, Clock, 
  Camera, Mic, MicOff, Volume2, Play, Pause, RotateCcw,
  Sparkles, CheckCircle, Trash2, Edit3, Send, Upload, Star
} from "lucide-react";

const API_BASE = "http://localhost:8000";

function StudentDashboard() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  const [currentTab, setCurrentTab] = useState("dashboard");
  const [dashboardData, setDashboardData] = useState(null);
  const [notificationsList, setNotificationsList] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Auth guard - must be above all other useEffects but after all useState declarations
  useEffect(() => {
    if (!currentUser) {
      navigate("/");
    }
  }, []);

  // Stats & Schedule data loading
  useEffect(() => {
    if (!currentUser) return;
    fetchDashboard();
    fetchNotifications();
    fetchUserPreferences();
  }, []);

  const fetchUserPreferences = async () => {
    try {
      const response = await axios.get(`${API_BASE}/user/preferences`, {
        params: { email: currentUser.email }
      });
      if (response.data && response.data.voice_output !== undefined) {
        setTutorVoiceOutput(response.data.voice_output);
      }
    } catch (error) {
      console.error("Failed to load user preferences", error);
    }
  };

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API_BASE}/student/dashboard`, {
        params: { email: currentUser.email }
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API_BASE}/notifications`, {
        params: { email: currentUser.email, role: "student" }
      });
      setNotificationsList(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  // ================= 1. COURSES TAB STATE & LOGIC =================
  const [coursesList, setCoursesList] = useState([]);
  const [courseSearch, setCourseSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeModule, setActiveModule] = useState(null);
  const [courseDoubtText, setCourseDoubtText] = useState("");
  const [courseDoubtReply, setCourseDoubtReply] = useState("");
  const [doubtLoading, setDoubtLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [courseRating, setCourseRating] = useState(5);
  const [courseFeedback, setCourseFeedback] = useState("");
  const [activeQuizAnswers, setActiveQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [submoduleTicker, setSubmoduleTicker] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSubmoduleTicker(t => t + 1);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (currentTab === "courses") {
      fetchCourses();
    }
  }, [currentTab, courseSearch]);

  const fetchCourses = async () => {
    try {
      const response = await axios.get(`${API_BASE}/courses/available`, {
        params: { email: currentUser.email, search: courseSearch }
      });
      setCoursesList(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const enrollInCourse = async (courseId) => {
    try {
      await axios.post(`${API_BASE}/courses/${courseId}/enroll`, {
        email: currentUser.email
      });
      alert("Enrolled successfully!");
      fetchCourses();
      fetchDashboard();
    } catch (error) {
      alert("Enrollment failed.");
    }
  };

  const viewCourseDetails = async (courseId) => {
    try {
      const response = await axios.get(`${API_BASE}/courses/${courseId}`, {
        params: { email: currentUser.email }
      });
      setSelectedCourse(response.data);
      if (response.data.modules && response.data.modules.length > 0) {
        setActiveModule(response.data.modules[0]);
      } else {
        setActiveModule(null);
      }
      setCourseDoubtReply("");
      setQuizSubmitted(false);
      setQuizResult(null);
      setActiveQuizAnswers({});
    } catch (error) {
      alert("Failed to load course details.");
    }
  };

  const startSubmodule = async (courseId, submoduleId) => {
    try {
      await axios.post(`${API_BASE}/courses/${courseId}/submodules/${submoduleId}/start`, {
        email: currentUser.email
      });
      viewCourseDetails(courseId);
    } catch (e) {
      alert("Failed to start submodule.");
    }
  };

  const completeSubmodule = async (courseId, submoduleId) => {
    try {
      const response = await axios.post(`${API_BASE}/courses/${courseId}/submodules/${submoduleId}/complete`, {
        email: currentUser.email
      });
      alert(response.data.message);
      viewCourseDetails(courseId);
      fetchDashboard();
    } catch (e) {
      alert(e.response?.data?.message || "Failed to complete submodule.");
    }
  };

  const submitDoubt = async () => {
    if (!courseDoubtText.trim()) return;
    setDoubtLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/ai-tutor/chat`, {
        message: `In the context of the course "${selectedCourse.courseName}", clarify this doubt: ${courseDoubtText}`,
        history: []
      });
      setCourseDoubtReply(response.data.reply);
    } catch (error) {
      setCourseDoubtReply("Failed to clarify doubt. Please try again.");
    }
    setDoubtLoading(false);
  };

  const postComment = async () => {
    if (!newComment.trim()) return;
    try {
      const response = await axios.post(`${API_BASE}/courses/${selectedCourse._id}/comments`, {
        email: currentUser.email,
        fullName: currentUser.fullName,
        text: newComment
      });
      setSelectedCourse(prev => ({
        ...prev,
        comments: [...(prev.comments || []), response.data]
      }));
      setNewComment("");
    } catch (error) {
      alert("Failed to post comment.");
    }
  };

  const submitRating = async () => {
    try {
      await axios.post(`${API_BASE}/courses/${selectedCourse._id}/ratings`, {
        email: currentUser.email,
        rating: courseRating,
        feedback: courseFeedback
      });
      alert("Thank you for your feedback!");
      setCourseFeedback("");
      viewCourseDetails(selectedCourse._id);
    } catch (error) {
      alert("Failed to submit rating.");
    }
  };

  const submitCourseQuiz = async () => {
    const questions = selectedCourse.quiz?.questions || [];
    if (questions.length === 0) return;
    
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (activeQuizAnswers[idx] === q.correctIndex) {
        correctCount++;
      }
    });

    const finalScore = Math.round((correctCount / questions.length) * 100);

    try {
      const response = await axios.post(`${API_BASE}/courses/${selectedCourse._id}/quiz/submit`, {
        email: currentUser.email,
        score: finalScore
      });
      setQuizResult({
        score: finalScore,
        passed: response.data.passed,
        message: response.data.message
      });
      setQuizSubmitted(true);
      fetchDashboard();
    } catch (error) {
      alert("Failed to submit quiz.");
    }
  };

  // ================= 2. NOTES TAB STATE & LOGIC =================
  const [notesList, setNotesList] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [noteFile, setNoteFile] = useState(null);
  const [noteLoading, setNoteLoading] = useState(false);
  const [notesActivePane, setNotesActivePane] = useState("summary");

  useEffect(() => {
    if (currentTab === "notes") {
      fetchNotes();
    }
  }, [currentTab]);

  const fetchNotes = async () => {
    try {
      const response = await axios.get(`${API_BASE}/notes`, {
        params: { email: currentUser.email }
      });
      setNotesList(response.data);
      if (response.data.length > 0) {
        setSelectedNote(response.data[0]);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleNoteUpload = async (e) => {
    e.preventDefault();
    if (!noteFile) return;
    setNoteLoading(true);
    
    const formData = new FormData();
    formData.append("file", noteFile);
    formData.append("email", currentUser.email);

    try {
      const response = await axios.post(`${API_BASE}/notes/analyze`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      alert("Notes analyzed successfully!");
      setNoteFile(null);
      fetchNotes();
      setSelectedNote(response.data);
    } catch (error) {
      alert(error.response?.data?.message || "Analysis failed.");
    }
    setNoteLoading(false);
  };

  // ================= 3. RESUME ANALYSIS & MOCK INTERVIEW =================
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [atsResult, setAtsResult] = useState(null);
  const [atsLoading, setAtsLoading] = useState(false);
  
  // Mock Interview states
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewQuestions, setInterviewQuestions] = useState([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [interviewLog, setInterviewLog] = useState([]);
  const [answerText, setAnswerText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [interviewEvaluation, setInterviewEvaluation] = useState(null);
  const [evaluatingInterview, setEvaluatingInterview] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [interviewPaused, setInterviewPaused] = useState(false);
  const [interviewTimer, setInterviewTimer] = useState(0);
  const [interviewQuestionsLoading, setInterviewQuestionsLoading] = useState(false);
  const interviewTimerRef = useRef(null);

  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recognitionRef = useRef(null);
  
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // KEY FIX: bind camera stream AFTER interviewStarted causes video element to mount
  useEffect(() => {
    if (!interviewStarted) return;
    let cancelled = false;
    const initCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError("Your browser does not support camera/microphone access.");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        mediaStreamRef.current = stream;

        // Initialize MediaRecorder for practicing
        try {
          const recorder = new MediaRecorder(stream);
          recordedChunksRef.current = [];
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              recordedChunksRef.current.push(e.data);
            }
          };
          recorder.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
            const url = URL.createObjectURL(blob);
            setRecordedVideoUrl(url);
          };
          recorder.start(1000); // chunk every 1s
          mediaRecorderRef.current = recorder;
        } catch (recErr) {
          console.error("MediaRecorder initialization failed:", recErr);
        }

        // Wait for video element to be in DOM after React re-render
        const bindStream = () => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          } else {
            setTimeout(bindStream, 50);
          }
        };
        bindStream();
      } catch (err) {
        if (cancelled) return;
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setCameraError("Camera/Microphone permission denied. Please allow browser access and try again.");
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setCameraError("No camera/microphone device found. Connect a camera/microphone and try again.");
        } else if (err.name === "NotReadableError") {
          setCameraError("Camera/Microphone is already in use by another application.");
        } else {
          setCameraError(`Device error: ${err.message}`);
        }
      }
    };
    initCamera();
    // Start interview timer
    interviewTimerRef.current = setInterval(() => {
      setInterviewTimer(prev => prev + 1);
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(interviewTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [interviewStarted]);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleResumeUpload = async (e) => {
    e.preventDefault();
    if (!resumeFile || !jobDescription.trim()) {
      alert("Please upload a resume file and paste a Job Description.");
      return;
    }
    setAtsLoading(true);
    setAtsResult(null);

    const formData = new FormData();
    formData.append("file", resumeFile);
    formData.append("email", currentUser.email);
    formData.append("jobDescription", jobDescription);

    try {
      const response = await axios.post(`${API_BASE}/resume/analyze`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setAtsResult(response.data);
    } catch (error) {
      alert("ATS analysis failed.");
    }
    setAtsLoading(false);
  };

  const startMockInterview = async () => {
    setInterviewStarted(true);
    setInterviewEvaluation(null);
    setRecordedVideoUrl(null);
    setCurrentQuestionIdx(0);
    setInterviewLog([]);
    setAnswerText("");
    setCameraError(null);
    setInterviewPaused(false);
    setInterviewTimer(0);
    setInterviewQuestionsLoading(true);

    // Fetch Questions
    try {
      const response = await axios.post(`${API_BASE}/resume/mock-interview/generate`, {
        resumeText: "Applicant details uploaded",
        jobDescription: jobDescription
      });
      setInterviewQuestions(response.data);
      speakQuestion(response.data[0]);
    } catch (error) {
      console.error(error);
    }
    setInterviewQuestionsLoading(false);
  };

  const speakQuestion = (text) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  const toggleInterviewPause = () => {
    if (interviewPaused) {
      interviewTimerRef.current = setInterval(() => setInterviewTimer(prev => prev + 1), 1000);
    } else {
      clearInterval(interviewTimerRef.current);
    }
    setInterviewPaused(prev => !prev);
  };

  const handleVoiceAnswer = () => {
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Voice speech recognition is not supported in this browser. Please type your answer.");
      return;
    }

    const rec = new SpeechRec();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onstart = () => setIsRecording(true);
    rec.onend = () => setIsRecording(false);
    rec.onerror = () => setIsRecording(false);
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setAnswerText(prev => prev + " " + text);
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const submitQuestionAnswer = () => {
    const updatedLog = [
      ...interviewLog,
      { question: interviewQuestions[currentQuestionIdx], answer: answerText }
    ];
    setInterviewLog(updatedLog);
    setAnswerText("");

    if (currentQuestionIdx + 1 < interviewQuestions.length) {
      setCurrentQuestionIdx(prev => prev + 1);
      speakQuestion(interviewQuestions[currentQuestionIdx + 1]);
    } else {
      // Completed last question
      evaluateInterview(updatedLog);
    }
  };

  const endInterviewEarly = () => {
    if (window.confirm("End the interview now and submit your current answers for evaluation?")) {
      const updatedLog = [
        ...interviewLog,
        ...(answerText.trim() ? [{ question: interviewQuestions[currentQuestionIdx], answer: answerText }] : [])
      ];
      evaluateInterview(updatedLog);
    }
  };

  const evaluateInterview = async (logData) => {
    setEvaluatingInterview(true);
    // Stop camera stream & MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    clearInterval(interviewTimerRef.current);
    try {
      const response = await axios.post(`${API_BASE}/resume/mock-interview/evaluate`, {
        log: logData
      });
      setInterviewEvaluation(response.data);
      setInterviewStarted(false);
    } catch (error) {
      alert("Evaluation failed.");
      setInterviewStarted(false);
    }
    setEvaluatingInterview(false);
  };

  // ================= 4. STUDY PLANNER (AI & MANUAL & POMODORO) =================
  const [plannerTasks, setPlannerTasks] = useState([]);
  const [plannerCourse, setPlannerCourse] = useState("");
  const [plannerGoal, setPlannerGoal] = useState("");
  const [plannerDeadline, setPlannerDeadline] = useState("");
  const [plannerHours, setPlannerHours] = useState(2);
  const [plannerStartDate, setPlannerStartDate] = useState("");
  const [plannerLevel, setPlannerLevel] = useState("Beginner");
  const [aiPlanTasks, setAiPlanTasks] = useState([]);
  const [aiPlanLoading, setAiPlanLoading] = useState(false);
  
  // Custom manual task form
  const [manualForm, setManualForm] = useState({
    title: "", course: "", priority: "Medium", date: "", startTime: "", endTime: ""
  });
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [showManualModal, setShowManualModal] = useState(false);

  // Pomodoro states
  const [pomoMinutes, setPomoMinutes] = useState(25);
  const [pomoSeconds, setPomoSeconds] = useState(0);
  const [pomoRunning, setPomoRunning] = useState(false);
  const [pomoMode, setPomoMode] = useState("Work"); // Work / Break
  const [pomoSound, setPomoSound] = useState(true);
  const pomoTimerRef = useRef(null);

  useEffect(() => {
    if (currentTab === "study-planner") {
      fetchManualTasks();
      fetchAIPlan();
    }
  }, [currentTab]);

  const fetchManualTasks = async () => {
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      // Get all tasks or today's tasks
      const response = await axios.get(`${API_BASE}/tasks/today`, {
        params: { email: currentUser.email, date: todayStr }
      });
      setPlannerTasks(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAIPlan = async () => {
    try {
      const response = await axios.get(`${API_BASE}/study-plan`, {
        params: { email: currentUser.email }
      });
      setAiPlanTasks(response.data.generatedTasks);
      setPlannerCourse(response.data.course);
      setPlannerGoal(response.data.goal);
      setPlannerDeadline(response.data.deadline);
      setPlannerHours(response.data.dailyHours);
      setPlannerStartDate(response.data.startDate || "");
      setPlannerLevel(response.data.learningLevel || "Beginner");
    } catch (e) {
      setAiPlanTasks([]);
    }
  };

  const handleAddManualTask = async () => {
    try {
      const dayName = new Date(manualForm.date).toLocaleDateString("en-US", { weekday: "long" });
      if (editingTaskId) {
        await axios.put(`${API_BASE}/tasks/${editingTaskId}`, {
          ...manualForm, day: dayName
        });
      } else {
        await axios.post(`${API_BASE}/tasks`, {
          ...manualForm, studentEmail: currentUser.email, day: dayName
        });
      }
      setShowManualModal(false);
      setEditingTaskId(null);
      setManualForm({ title: "", course: "", priority: "Medium", date: "", startTime: "", endTime: "" });
      fetchManualTasks();
      fetchDashboard();
    } catch (error) {
      alert("Failed to save task.");
    }
  };

  const startTaskEdit = (task) => {
    setEditingTaskId(task._id);
    setManualForm({
      title: task.title,
      course: task.course,
      priority: task.priority,
      date: task.date,
      startTime: task.startTime,
      endTime: task.endTime
    });
    setShowManualModal(true);
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await axios.put(`${API_BASE}/tasks/${taskId}/complete`);
      fetchManualTasks();
      fetchDashboard();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await axios.delete(`${API_BASE}/tasks/${taskId}`);
      fetchManualTasks();
      fetchDashboard();
    } catch (error) {
      console.error(error);
    }
  };

  const generateAIPlanner = async () => {
    setAiPlanLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/generate-study-plan`, {
        email: currentUser.email,
        course: plannerCourse,
        goal: plannerGoal,
        deadline: plannerDeadline,
        dailyHours: plannerHours,
        startDate: plannerStartDate,
        learningLevel: plannerLevel
      });
      setAiPlanTasks(response.data);
    } catch (error) {
      alert("Failed to generate AI plan.");
    }
    setAiPlanLoading(false);
  };

  const completeAIPlanTopic = async (idx) => {
    try {
      await axios.put(`${API_BASE}/study-plan/complete`, {
        email: currentUser.email,
        course: plannerCourse,
        index: idx
      });
      fetchAIPlan();
    } catch (error) {
      console.error(error);
    }
  };

  const deleteAIPlan = async () => {
    if (!window.confirm("Delete AI Study plan?")) return;
    try {
      await axios.delete(`${API_BASE}/study-plan`, {
        params: { email: currentUser.email, course: plannerCourse }
      });
      setAiPlanTasks([]);
    } catch (error) {
      console.error(error);
    }
  };

  // Pomodoro timer logic
  useEffect(() => {
    if (pomoRunning) {
      pomoTimerRef.current = setInterval(() => {
        if (pomoSeconds > 0) {
          setPomoSeconds(prev => prev - 1);
        } else if (pomoMinutes > 0) {
          setPomoMinutes(prev => prev - 1);
          setPomoSeconds(59);
        } else {
          // Timer finished!
          clearInterval(pomoTimerRef.current);
          setPomoRunning(false);
          playPomoAlarm();
          
          if (pomoMode === "Work") {
            setPomoMode("Break");
            setPomoMinutes(5);
          } else {
            setPomoMode("Work");
            setPomoMinutes(25);
          }
        }
      }, 1000);
    } else {
      clearInterval(pomoTimerRef.current);
    }
    return () => clearInterval(pomoTimerRef.current);
  }, [pomoRunning, pomoMinutes, pomoSeconds, pomoMode]);

  const playPomoAlarm = () => {
    if (!pomoSound) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 1.0);
    } catch (e) {
      console.warn("Audio alarm issue:", e);
    }
  };

  // ================= 5. QUIZZES MODULE =================
  const [quizTopic, setQuizTopic] = useState("");
  const [quizFile, setQuizFile] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizGrade, setQuizGrade] = useState(null);
  const [quizHistory, setQuizHistory] = useState([]);

  useEffect(() => {
    if (currentTab === "quizzes") {
      fetchQuizHistory();
    }
  }, [currentTab]);

  const fetchQuizHistory = async () => {
    try {
      const response = await axios.get(`${API_BASE}/quizzes/history`, {
        params: { email: currentUser.email }
      });
      setQuizHistory(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleGenerateQuiz = async (e) => {
    e.preventDefault();
    setQuizLoading(true);
    setGeneratedQuiz(null);
    setQuizGrade(null);
    setQuizAnswers({});

    try {
      let docText = "";
      if (quizFile) {
        // First analyze or parse file text
        const formData = new FormData();
        formData.append("file", quizFile);
        formData.append("email", currentUser.email);
        const parseRes = await axios.post(`${API_BASE}/notes/analyze`, formData);
        docText = parseRes.data.summary;
      }

      const response = await axios.post(`${API_BASE}/quizzes/generate`, {
        topic: quizTopic,
        documentText: docText
      });
      setGeneratedQuiz(response.data);
      setQuizTopic("");
      setQuizFile(null);
    } catch (error) {
      alert("Failed to generate quiz. Try a simpler topic.");
    }
    setQuizLoading(false);
  };

  const submitQuizAnswers = async () => {
    const questions = generatedQuiz.questions || [];
    let correct = 0;
    questions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctIndex) correct++;
    });

    const scorePct = Math.round((correct / questions.length) * 100);
    setQuizGrade(scorePct);

    try {
      await axios.post(`${API_BASE}/quizzes/save`, {
        email: currentUser.email,
        title: generatedQuiz.title,
        subject: generatedQuiz.title.replace("Quiz on ", ""),
        score: scorePct
      });
      fetchQuizHistory();
      fetchDashboard();
    } catch (e) {
      console.error(e);
    }
  };

  // ================= 6. AI TUTOR TAB =================
  const [tutorMessages, setTutorMessages] = useState([
    { role: "assistant", content: "Hi! I am Lumina, your AI Tutor. Ask me any question, upload a note, or snap a photo of a doubt to learn together!" }
  ]);
  const [tutorInput, setTutorInput] = useState("");
  const [tutorLoading, setTutorLoading] = useState(false);
  // Load voice preference from localStorage (persists across logins)
  const [tutorVoiceOutput, setTutorVoiceOutput] = useState(() => {
    try {
      return localStorage.getItem("lumina_voice_output") === "true";
    } catch { return false; }
  });
  // mic states: 'idle' | 'listening' | 'processing'
  const [tutorMicState, setTutorMicState] = useState("idle");
  // TTS playback control
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [lastTtsUtterance, setLastTtsUtterance] = useState(null);
  const [ttsState, setTtsState] = useState("stopped");
  // image upload alternative to camera
  const [tutorImageFile, setTutorImageFile] = useState(null);
  const tutorImageInputRef = useRef(null);
  
  // Visual snaps
  const [showTutorCam, setShowTutorCam] = useState(false);
  const [capturedSnap, setCapturedSnap] = useState(null);
  const [tutorCameraError, setTutorCameraError] = useState(null);
  const tutorVideoRef = useRef(null);
  const tutorStreamRef = useRef(null);
  const tutorChatBottomRef = useRef(null);

  // Save voice preference to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("lumina_voice_output", tutorVoiceOutput.toString());
      // Also persist to backend for cross-device restore
      if (currentUser) {
        axios.post(`${API_BASE}/user/preferences`, {
          email: currentUser.email,
          preferences: { voice_output: tutorVoiceOutput }
        }).catch(() => {}); // silent fail OK — localStorage is primary
      }
    } catch {}
  }, [tutorVoiceOutput]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    tutorChatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [tutorMessages, tutorLoading]);

  // KEY FIX: bind tutor camera AFTER showTutorCam causes video element to mount
  useEffect(() => {
    if (!showTutorCam) return;
    let cancelled = false;
    const initTutorCam = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setTutorCameraError("Camera API not supported in this browser.");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        tutorStreamRef.current = stream;
        const bindStream = () => {
          if (tutorVideoRef.current) {
            tutorVideoRef.current.srcObject = stream;
            tutorVideoRef.current.play().catch(() => {});
          } else {
            setTimeout(bindStream, 50);
          }
        };
        bindStream();
      } catch (err) {
        if (cancelled) return;
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setTutorCameraError("Camera permission denied. Please allow camera access in browser settings.");
        } else if (err.name === "NotFoundError") {
          setTutorCameraError("No camera device detected.");
        } else {
          setTutorCameraError(`Camera error: ${err.message}`);
        }
        setShowTutorCam(false);
      }
    };
    initTutorCam();
    return () => { cancelled = true; };
  }, [showTutorCam]);

  const stopTutorCamera = () => {
    if (tutorStreamRef.current) {
      tutorStreamRef.current.getTracks().forEach(t => t.stop());
      tutorStreamRef.current = null;
    }
    setShowTutorCam(false);
  };

  const handleSendTutorMessage = async () => {
    if (!tutorInput.trim() && !capturedSnap && !tutorImageFile) return;
    
    let contentToSend = tutorInput;
    if (capturedSnap) contentToSend += " [Camera snapshot attached for visual analysis]";
    if (tutorImageFile) contentToSend += ` [Image uploaded: ${tutorImageFile.name}]`;

    const newMsgs = [...tutorMessages, { role: "user", content: contentToSend }];
    setTutorMessages(newMsgs);
    setTutorInput("");
    setCapturedSnap(null);
    setTutorImageFile(null);
    setTutorLoading(true);
    setTutorMicState("idle");

    try {
      const response = await axios.post(`${API_BASE}/ai-tutor/chat`, {
        message: contentToSend,
        history: tutorMessages
      });
      const reply = response.data.reply;
      setTutorMessages(prev => [...prev, { role: "assistant", content: reply }]);
      
      if (tutorVoiceOutput && window.speechSynthesis) {
        speakTutorReply(reply);
      }
    } catch (error) {
      setTutorMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please check your connection and try again." }]);
    }
    setTutorLoading(false);
  };

  const speakTutorReply = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.onstart = () => { setTtsPlaying(true); setTtsState("playing"); };
    utter.onend = () => { setTtsPlaying(false); setTtsState("stopped"); };
    utter.onerror = () => { setTtsPlaying(false); setTtsState("stopped"); };
    setLastTtsUtterance(utter);
    window.speechSynthesis.speak(utter);
    setTtsPlaying(true);
    setTtsState("playing");
  };

  const playTTS = () => {
    if (!window.speechSynthesis) return;
    if (ttsState === "paused") {
      resumeTTS();
      return;
    }
    // Find the last assistant message and speak it
    const lastAssistantMsg = [...tutorMessages].reverse().find(m => m.role === "assistant");
    if (lastAssistantMsg) {
      speakTutorReply(lastAssistantMsg.content);
    }
  };

  const pauseTTS = () => {
    window.speechSynthesis?.pause();
    setTtsPlaying(false);
    setTtsState("paused");
  };

  const resumeTTS = () => {
    window.speechSynthesis?.resume();
    setTtsPlaying(true);
    setTtsState("playing");
  };

  const stopTTS = () => {
    window.speechSynthesis?.cancel();
    setTtsPlaying(false);
    setTtsState("stopped");
  };

  const handleTutorVoiceInput = () => {
    if (tutorMicState === "listening") {
      if (recognitionRef.current) recognitionRef.current.stop();
      setTutorMicState("idle");
      return;
    }
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    const rec = new SpeechRec();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart = () => setTutorMicState("listening");
    rec.onend = () => setTutorMicState("idle");
    rec.onerror = (err) => {
      setTutorMicState("idle");
      if (err.error === "not-allowed") alert("Microphone permission denied. Allow mic access in browser settings.");
    };
    rec.onresult = (e) => {
      setTutorMicState("processing");
      setTutorInput(e.results[0][0].transcript);
    };
    recognitionRef.current = rec;
    rec.start();
  };

  const startTutorCamera = () => {
    setTutorCameraError(null);
    setCapturedSnap(null);
    setTutorImageFile(null);
    setShowTutorCam(true); // triggers the useEffect that binds stream
  };

  const captureTutorSnap = () => {
    if (tutorVideoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(tutorVideoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");
      setCapturedSnap(dataUrl);
      stopTutorCamera();
    }
  };

  const handleTutorImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setTutorImageFile(file);
    setCapturedSnap(null);
    // Show preview
    const reader = new FileReader();
    reader.onload = (ev) => setCapturedSnap(ev.target.result);
    reader.readAsDataURL(file);
  };

  // ================= 7. PROMPT ENGINEERING GAME =================
  const [promptGameImage, setPromptGameImage] = useState({
    name: "Cyberpunk neon library",
    desc: "A futuristic glowing library with holographic books and purple-cyan lighting",
    url: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=640"
  });
  const [gamePromptInput, setGamePromptInput] = useState("");
  const [gameTimer, setGameTimer] = useState(60);
  const [gameActive, setGameActive] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [gameHistory, setGameHistory] = useState([]);
  const [gameLoading, setGameLoading] = useState(false);
  const gameTimerIntervalRef = useRef(null);

  useEffect(() => {
    if (currentTab === "prompt-game") {
      fetchGameHistory();
    }
    return () => clearInterval(gameTimerIntervalRef.current);
  }, [currentTab]);

  useEffect(() => {
    if (gameActive && gameTimer > 0) {
      gameTimerIntervalRef.current = setInterval(() => {
        setGameTimer(prev => prev - 1);
      }, 1000);
    } else if (gameTimer === 0 && gameActive) {
      clearInterval(gameTimerIntervalRef.current);
      setGameActive(false);
      alert("Time's up! Let's evaluate your prompt.");
      submitGamePrompt();
    }
    return () => clearInterval(gameTimerIntervalRef.current);
  }, [gameTimer, gameActive]);

  const fetchGameHistory = async () => {
    try {
      const response = await axios.get(`${API_BASE}/prompt-game/history`, {
        params: { email: currentUser.email }
      });
      setGameHistory(response.data);
    } catch (e) {
      console.error(e);
    }
  };

  const startPromptGame = () => {
    const challenges = [
      { name: "Cyberpunk library", desc: "A futuristic glowing library with holographic books and purple-cyan lighting", url: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=640" },
      { name: "Astronaut on coffee break", desc: "An astronaut floating in space sipping espresso from a zero gravity cup, cinematic lighting", url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=640" },
      { name: "Steampunk flying train", desc: "A massive detailed steam locomotive engine flying through white fluffy clouds, brass pipes, golden skies", url: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?q=80&w=640" }
    ];
    const item = challenges[Math.floor(Math.random() * challenges.length)];
    setPromptGameImage(item);
    setGamePromptInput("");
    setGameTimer(60);
    setGameActive(true);
    setGameResult(null);
  };

  const submitGamePrompt = async () => {
    clearInterval(gameTimerIntervalRef.current);
    setGameActive(false);
    setGameLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/prompt-game/evaluate`, {
        email: currentUser.email,
        referencePrompt: promptGameImage.desc,
        studentPrompt: gamePromptInput,
        imageName: promptGameImage.name
      });
      setGameResult(response.data);
      fetchGameHistory();
      fetchDashboard();
    } catch (e) {
      alert("Grading failed.");
    }
    setGameLoading(false);
  };

  // ================= 8. PROGRESS TAB =================
  const [progressData, setProgressData] = useState(null);

  useEffect(() => {
    if (currentTab === "progress") {
      fetchProgress();
    }
  }, [currentTab]);

  const fetchProgress = async () => {
    try {
      const response = await axios.get(`${API_BASE}/student/progress`, {
        params: { email: currentUser.email }
      });
      setProgressData(response.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">🎓</div>
          <div>
            <h2>Lumina</h2>
            <p>AI LMS</p>
          </div>
        </div>

        <div className="menu-section">
          <span>Learn</span>
          <ul>
            <li className={currentTab === "dashboard" ? "active" : ""} onClick={() => { setCurrentTab("dashboard"); setSelectedCourse(null); }}>Dashboard</li>
            <li className={currentTab === "courses" ? "active" : ""} onClick={() => { setCurrentTab("courses"); setSelectedCourse(null); }}>Courses</li>
            <li className={currentTab === "notes" ? "active" : ""} onClick={() => { setCurrentTab("notes"); setSelectedCourse(null); }}>Notes</li>
          </ul>
        </div>

        <div className="menu-section">
          <span>AI Tools</span>
          <ul>
            <li className={currentTab === "ai-tutor" ? "active" : ""} onClick={() => { setCurrentTab("ai-tutor"); setSelectedCourse(null); }}>AI Tutor</li>
            <li className={currentTab === "quizzes" ? "active" : ""} onClick={() => { setCurrentTab("quizzes"); setSelectedCourse(null); }}>Quizzes</li>
            <li className={currentTab === "resume-analysis" ? "active" : ""} onClick={() => { setCurrentTab("resume-analysis"); setSelectedCourse(null); }}>Resume Analysis</li>
            <li className={currentTab === "study-planner" ? "active" : ""} onClick={() => { setCurrentTab("study-planner"); setSelectedCourse(null); }}>Study Planner</li>
            <li className={currentTab === "prompt-game" ? "active" : ""} onClick={() => { setCurrentTab("prompt-game"); setSelectedCourse(null); }}>Prompt Game</li>
          </ul>
        </div>

        <div className="menu-section">
          <span>Insights</span>
          <ul>
            <li className={currentTab === "progress" ? "active" : ""} onClick={() => { setCurrentTab("progress"); setSelectedCourse(null); }}>Progress</li>
          </ul>
        </div>

        <div className="profile-box">
          <div className="avatar">
            {currentUser.fullName.charAt(0)}
          </div>
          <div>
            <h4>{currentUser.fullName}</h4>
            <p onClick={handleLogout} style={{color: "#ef4444", cursor: "pointer", fontWeight: "600"}}>Logout</p>
          </div>
        </div>
      </aside>

      {/* Main Layout */}
      <main className="dashboard-content">
        {/* Topbar */}
        <header className="topbar">
          <div style={{fontWeight: "600", fontSize: "18px", color: "#334155"}}>
            Lumina LMS / {currentTab.toUpperCase()}
          </div>
          <div className="topbar-right">
            <button className="ai-active">✨ AI Active</button>
            <button className="notification" onClick={() => setShowNotifications(!showNotifications)}>🔔</button>
            <div className="top-avatar">{currentUser.fullName.charAt(0)}</div>
          </div>
        </header>

        {/* Notifications Dropdown Panel */}
        {showNotifications && (
          <div className="notifications-dropdown" style={{
            position: "absolute", top: "70px", right: "40px", background: "white", 
            border: "1px solid #e2e8f0", borderRadius: "14px", width: "320px",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", zIndex: 100
          }}>
            <div style={{padding: "12px 16px", borderBottom: "1px solid #e2e8f0", fontWeight: "600", color: "#1f2937"}}>
              In-app Announcements
            </div>
            <div style={{maxHeight: "300px", overflowY: "auto", padding: "8px"}}>
              {notificationsList.length === 0 ? (
                <p style={{padding: "12px", color: "#9ca3af", fontSize: "14px"}}>No announcements yet.</p>
              ) : (
                notificationsList.map((notif, idx) => (
                  <div key={idx} style={{padding: "10px", borderBottom: "1px solid #f3f4f6", fontSize: "13px"}}>
                    <div style={{fontWeight: "600", color: "#4b5563"}}>{notif.title}</div>
                    <p style={{color: "#6b7280", margin: "4px 0"}}>{notif.message}</p>
                    <span style={{fontSize: "11px", color: "#9ca3af"}}>From: {notif.senderName} ({notif.date})</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= TAB CONTENT 1: DASHBOARD ================= */}
        {currentTab === "dashboard" && dashboardData && (
          <div>
            <div className="welcome-section">
              <div>
                <h1>Welcome back, {dashboardData.fullName} 👋</h1>
                <p>Track your courses, daily study targets, and quizzes.</p>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button className="tutor-btn" style={{background: "#10B981"}} onClick={() => setCurrentTab("ai-tutor")}>🤖 Ask AI Tutor</button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-top">
                  <span>ACTIVE COURSES</span>
                  <div className="stat-icon">📚</div>
                </div>
                <h2>{dashboardData.stats.activeCourses}</h2>
                <p>Enrolled</p>
              </div>
              <div className="stat-card">
                <div className="stat-top">
                  <span>STUDY HOURS</span>
                  <div className="stat-icon">🕒</div>
                </div>
                <h2>{dashboardData.stats.studyHours}</h2>
                <p>Hours Completed</p>
              </div>
              <div className="stat-card">
                <div className="stat-top">
                  <span>LEARNING STREAK</span>
                  <div className="stat-icon">🔥</div>
                </div>
                <h2>{dashboardData.stats.streak}</h2>
                <p>Consecutive Days</p>
              </div>
              <div className="stat-card">
                <div className="stat-top">
                  <span>AVG. QUIZ SCORE</span>
                  <div className="stat-icon">🏆</div>
                </div>
                <h2>{dashboardData.stats.avgQuizScore}%</h2>
                <p>Assessments</p>
              </div>
            </div>

            {/* Middle Grid */}
            <div className="middle-grid">
              {/* Enrolled Courses */}
              <div className="learning-card">
                <div className="card-header">
                  <h3>Continue learning</h3>
                  <button onClick={() => setCurrentTab("courses")}>View all →</button>
                </div>
                {dashboardData.courses.length === 0 ? (
                  <p style={{marginTop: "20px", color: "#64748b"}}>You are not enrolled in any courses yet. Go to the Courses tab to get started!</p>
                ) : (
                  dashboardData.courses.map((course, index) => (
                    <div className="course-item" key={index} style={{cursor: "pointer"}} onClick={() => { setCurrentTab("courses"); viewCourseDetails(course.courseId || course._id); }}>
                      <div className="course-icon" style={{ background: course.color || "#4F46E5" }} />
                      <div className="course-info">
                        <div className="course-title-row">
                          <h4>{course.courseName}</h4>
                          <span>{course.level || "Beginner"}</span>
                        </div>
                        <p>{course.instructorName || "Instructor"} • {course.duration || "Self-paced"}</p>
                        <div className="progress-row">
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${course.status === "Completed" ? 100 : (course.progress || 0)}%` }} />
                          </div>
                          <span>{course.status === "Completed" ? "100%" : `${course.progress || 0}%`}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Today's Schedule */}
              <div className="study-card">
                <div className="card-header">
                  <h3>Today's Schedule</h3>
                  <button onClick={() => setCurrentTab("study-planner")}>Go to Planner</button>
                </div>
                <div style={{marginTop: "20px"}}>
                  {plannerTasks.length === 0 ? (
                    <p style={{color: "#64748b"}}>No tasks listed for today.</p>
                  ) : (
                    plannerTasks.map((t, idx) => (
                      <div key={idx} className="quiz-item" style={{background: t.status === "Completed" ? "#f0fdf4" : "white", border: "1px solid #e5e7eb", marginBottom: "10px", padding: "12px 16px", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                        <div>
                          <h4 style={{textDecoration: t.status === "Completed" ? "line-through" : "none", color: "#1e293b"}}>{t.title}</h4>
                          <span style={{fontSize: "12px", color: "#64748b"}}>{t.startTime} - {t.endTime} ({t.course})</span>
                        </div>
                        <span style={{
                          fontSize: "12px", padding: "4px 8px", borderRadius: "999px",
                          background: t.priority === "High" ? "#fee2e2" : t.priority === "Medium" ? "#fef3c7" : "#d1fae5",
                          color: t.priority === "High" ? "#ef4444" : t.priority === "Medium" ? "#f59e0b" : "#10b981"
                        }}>{t.priority}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Grid */}
            <div className="bottom-grid">
              {/* Recent Quizzes */}
              <div className="quiz-card">
                <div className="card-header">
                  <h3>Recent quizzes</h3>
                  <button onClick={() => setCurrentTab("quizzes")}>Quiz panel</button>
                </div>
                {dashboardData.quizzes.length === 0 ? (
                  <p style={{marginTop: "20px", color: "#64748b"}}>No quiz assessments logged yet.</p>
                ) : (
                  dashboardData.quizzes.map((quiz, index) => (
                    <div className="quiz-item" key={index}>
                      <div>
                        <h4>{quiz.title}</h4>
                        <p>{quiz.subject}</p>
                      </div>
                      <span className="score" style={{color: quiz.score >= 60 ? "#10b981" : "#ef4444"}}>{quiz.score}%</span>
                    </div>
                  ))
                )}
              </div>

              {/* Tip of the Day */}
              <div className="tip-card">
                <h3>✨ AI Tip of the day</h3>
                <p>"Active recall beats re-reading. Try explaining what you just learned out loud or test yourself with a 5-card flashcard sprint after each module."</p>
                <button onClick={() => setCurrentTab("ai-tutor")}>Consult AI Tutor</button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB CONTENT 2: COURSES ================= */}
        {currentTab === "courses" && (
          <div>
            {!selectedCourse ? (
              <div>
                <div className="welcome-section" style={{marginBottom: "24px"}}>
                  <div>
                    <h1>Explore Courses</h1>
                    <p>Find, enroll, and learn from premium courses created by instructors.</p>
                  </div>
                  <input
                    className="search"
                    style={{width: "350px"}}
                    placeholder="Search courses by keyword..."
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                  />
                </div>

                <div className="courses-listing-grid" style={{display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px"}}>
                  {coursesList.map((course, idx) => (
                    <div key={idx} style={{background: "white", borderRadius: "18px", border: "1px solid #e2e8f0", padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between"}}>
                      <div>
                        <div style={{height: "8px", borderRadius: "999px", background: course.color || "#4F46E5", marginBottom: "16px"}} />
                        <span style={{fontSize: "12px", background: "#eef2ff", color: "#4f46e5", padding: "4px 8px", borderRadius: "999px"}}>{course.level}</span>
                        <h3 style={{margin: "12px 0 6px", color: "#0f172a"}}>{course.courseName}</h3>
                        <p style={{color: "#64748b", fontSize: "14px", lineBreak: "anywhere"}}>{course.description.slice(0, 120)}...</p>
                        <div style={{margin: "12px 0", fontSize: "13px", color: "#475569"}}>
                          <span>👨‍🏫 {course.instructorName}</span> | <span>🕒 {course.duration}</span>
                        </div>
                        <div style={{display: "flex", alignItems: "center", gap: "4px", margin: "8px 0", fontSize: "14px"}}>
                          <span style={{color: "#f59e0b"}}>★</span>
                          <span style={{fontWeight: "600"}}>{course.avgRating || "0.0"}</span>
                          <span style={{color: "#94a3b8"}}>({course.ratings?.length || 0} reviews)</span>
                        </div>
                      </div>
                      
                      <div style={{marginTop: "20px"}}>
                        {course.enrollmentStatus === "Not Enrolled" ? (
                          <button className="tutor-btn" style={{width: "100%"}} onClick={() => enrollInCourse(course._id)}>Enroll Now</button>
                        ) : (
                          <button className="tutor-btn" style={{width: "100%", background: "#475569"}} onClick={() => viewCourseDetails(course._id)}>
                            {course.enrollmentStatus === "Completed" ? "Completed (Review)" : "Resume Learning"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Selected Course Detailed view
              <div style={{background: "white", borderRadius: "20px", border: "1px solid #e2e8f0", padding: "24px"}}>
                <button onClick={() => setSelectedCourse(null)} style={{background: "none", border: "none", color: "#4f46e5", fontWeight: "600", cursor: "pointer", marginBottom: "16px"}}>← Back to Course Catalog</button>
                
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #f1f5f9", paddingBottom: "16px", marginBottom: "20px"}}>
                  <div>
                    <h1 style={{color: "#0f172a"}}>{selectedCourse.courseName}</h1>
                    <p style={{color: "#64748b", marginTop: "4px"}}>{selectedCourse.description}</p>
                  </div>
                  <div style={{textAlign: "right"}}>
                    <span style={{background: "#dcfce7", color: "#15803d", padding: "6px 12px", borderRadius: "999px", fontWeight: "600", fontSize: "14px"}}>
                      Enrolled: {selectedCourse.level}
                    </span>
                  </div>
                </div>

                <div style={{display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px"}}>
                  {/* Modules Sidebar */}
                  <div>
                    <h3 style={{marginBottom: "12px", color: "#1f2937"}}>Course Syllabus</h3>
                    <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
                      {selectedCourse.modules.length === 0 ? (
                        <p style={{color: "#94a3b8"}}>No curriculum modules uploaded yet.</p>
                      ) : (
                        selectedCourse.modules.map((mod, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => setActiveModule(mod)}
                            style={{
                              padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", cursor: "pointer",
                              background: activeModule?.id === mod.id ? "#eef2ff" : "white",
                              borderColor: activeModule?.id === mod.id ? "#5b6ef5" : "#e2e8f0"
                            }}
                          >
                            <h4 style={{color: "#1e293b"}}>{idx + 1}. {mod.title}</h4>
                            <span style={{fontSize: "11px", color: "#64748b"}}>{mod.contentType.toUpperCase()} Content</span>
                          </div>
                        ))
                      )}

                      {/* Course Assessment Quiz link */}
                      {selectedCourse.quiz?.questions?.length > 0 && (
                        <div 
                          onClick={() => setActiveModule({ title: "Final Assessment", id: "assessment", isQuiz: true })}
                          style={{
                            padding: "14px", borderRadius: "12px", border: "1px dashed #ef4444", cursor: "pointer", marginTop: "12px",
                            background: activeModule?.id === "assessment" ? "#fef2f2" : "white"
                          }}
                        >
                          <h4 style={{color: "#b91c1c"}}>🏆 Final Assessment Quiz</h4>
                          <span style={{fontSize: "11px", color: "#b91c1c"}}>Requires 60% score to complete course</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Active Module content pane */}
                  <div>
                    {activeModule?.isQuiz ? (
                      // Assessment Quiz View
                      <div style={{background: "#fafafb", border: "1px solid #e2e8f0", padding: "20px", borderRadius: "16px"}}>
                        <h2 style={{color: "#b91c1c", marginBottom: "16px"}}>Final Assessment Quiz</h2>
                        {quizSubmitted ? (
                          <div style={{textAlign: "center", padding: "20px"}}>
                            <span style={{fontSize: "48px"}}>{quizResult.passed ? "🎉" : "❌"}</span>
                            <h3 style={{margin: "12px 0"}}>{quizResult.passed ? "Congratulations!" : "Keep learning!"}</h3>
                            <h2 style={{fontSize: "36px", color: quizResult.passed ? "#10b981" : "#ef4444"}}>{quizResult.score}%</h2>
                            <p style={{color: "#4b5563", margin: "12px 0"}}>{quizResult.message}</p>
                            <button className="tutor-btn" onClick={() => { setQuizSubmitted(false); setActiveQuizAnswers({}); }}>Try Quiz Again</button>
                          </div>
                        ) : (
                          <div>
                            {selectedCourse.quiz.questions.map((q, qidx) => (
                              <div key={qidx} style={{marginBottom: "20px", background: "white", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0"}}>
                                <h4 style={{color: "#1e293b", marginBottom: "12px"}}>{qidx + 1}. {q.question}</h4>
                                <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
                                  {q.options.map((opt, oidx) => (
                                    <label key={oidx} style={{display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "14px", padding: "8px", borderRadius: "6px", background: "#f8fafc"}}>
                                      <input 
                                        type="radio" 
                                        name={`q_${qidx}`} 
                                        checked={activeQuizAnswers[qidx] === oidx}
                                        onChange={() => setActiveQuizAnswers(prev => ({ ...prev, [qidx]: oidx }))}
                                      />
                                      {opt}
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ))}
                            <button className="tutor-btn" style={{width: "100%"}} onClick={submitCourseQuiz}>Submit Final Assessment</button>
                          </div>
                        )}
                      </div>
                    ) : activeModule ? (
                      <div style={{background: "#f8fafc", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0"}}>
                        <h2 style={{color: "#0f172a"}}>{activeModule.title}</h2>
                        <p style={{color: "#475569", margin: "12px 0"}}>{activeModule.description}</p>
                        
                        {/* Material View placeholder */}
                        <div style={{background: "#e2e8f0", height: "300px", borderRadius: "12px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", margin: "20px 0"}}>
                          <BookOpen size={48} color="#64748b" />
                          <h4 style={{color: "#334155", marginTop: "12px"}}>Lecture Content Panel</h4>
                          <span style={{fontSize: "12px", color: "#64748b"}}>{activeModule.contentType.toUpperCase()} mode enabled. Refer to PDF link: <a href={activeModule.contentUrl} target="_blank" rel="noopener noreferrer">{activeModule.contentUrl || "lms_module_materials.pdf"}</a></span>
                        </div>

                        {/* Submodules Checklist Section */}
                        {selectedCourse.enrollmentStatus !== "Not Enrolled" && (
                          <div style={{background: "white", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", margin: "20px 0"}}>
                            <h3 style={{margin: "0 0 12px", color: "#1e293b"}}>Submodule Learning Checklist</h3>
                            {(!activeModule.submodules || activeModule.submodules.length === 0) ? (
                              <p style={{fontSize: "13px", color: "#64748b"}}>No submodules configured for this module.</p>
                            ) : (
                              <div style={{display: "flex", flexDirection: "column", gap: "10px"}}>
                                {activeModule.submodules.map((sub, sidx) => {
                                  const subProgress = selectedCourse.submoduleProgress?.[sub.id] || {};
                                  const isCompleted = subProgress.status === "Completed";
                                  const isInProgress = subProgress.status === "In Progress";
                                  
                                  let isEligible = false;
                                  let remainingSec = 0;
                                  
                                  if (isInProgress && subProgress.startTime) {
                                    const elapsedMs = new Date() - new Date(subProgress.startTime);
                                    const elapsedMins = elapsedMs / 60000;
                                    const durationMins = sub.duration;
                                    if (elapsedMins >= durationMins) {
                                      isEligible = true;
                                    } else {
                                      remainingSec = Math.ceil(durationMins * 60 - elapsedMs / 1000);
                                    }
                                  }
                                  
                                  return (
                                    <div key={sidx} style={{
                                      display: "flex", justifyContent: "space-between", alignItems: "center",
                                      background: isCompleted ? "#f0fdf4" : isInProgress ? "#eff6ff" : "#f8fafc",
                                      border: "1px solid",
                                      borderColor: isCompleted ? "#bbf7d0" : isInProgress ? "#bfdbfe" : "#e2e8f0",
                                      padding: "12px", borderRadius: "8px"
                                    }}>
                                      <div>
                                        <div style={{fontWeight: "600", color: "#1e293b", fontSize: "14px"}}>{sub.title}</div>
                                        <span style={{fontSize: "12px", color: "#64748b"}}>Estimated duration: {sub.duration} minutes</span>
                                      </div>
                                      
                                      <div>
                                        {isCompleted ? (
                                          <span style={{color: "#16a34a", fontWeight: "700", fontSize: "13px"}}>✓ Completed</span>
                                        ) : isInProgress ? (
                                          <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
                                            {!isEligible && (
                                              <span style={{fontSize: "12px", color: "#2563eb", fontWeight: "600"}}>
                                                ⏳ Wait {Math.floor(remainingSec / 60)}m {remainingSec % 60}s
                                              </span>
                                            )}
                                            <button
                                              className="tutor-btn"
                                              style={{padding: "6px 12px", fontSize: "12px", background: isEligible ? "#10b981" : "#cbd5e1", cursor: isEligible ? "pointer" : "not-allowed"}}
                                              onClick={() => completeSubmodule(selectedCourse._id, sub.id)}
                                              disabled={!isEligible}
                                            >
                                              Mark Complete
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            className="tutor-btn"
                                            style={{padding: "6px 12px", fontSize: "12px", background: "#4F46E5"}}
                                            onClick={() => startSubmodule(selectedCourse._id, sub.id)}
                                          >
                                            Start Submodule
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Course Specific AI Doubt Clarifier */}
                        <div style={{background: "white", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", marginTop: "24px"}}>
                          <h4 style={{color: "#1e293b", display: "flex", alignItems: "center", gap: "6px"}}><Sparkles size={16} color="#5b6ef5" /> AI Lecture Assistant</h4>
                          <div style={{display: "flex", gap: "10px", marginTop: "12px"}}>
                            <input 
                              style={{flex: 1, padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px"}} 
                              placeholder="Ask a quick doubt about this lecture module..."
                              value={courseDoubtText}
                              onChange={(e) => setCourseDoubtText(e.target.value)}
                            />
                            <button className="tutor-btn" onClick={submitDoubt} disabled={doubtLoading}>
                              {doubtLoading ? "Thinking..." : "Ask"}
                            </button>
                          </div>
                          {courseDoubtReply && (
                            <div style={{marginTop: "12px", padding: "12px", background: "#f5f3ff", border: "1px solid #c084fc", borderRadius: "8px", fontSize: "14px", color: "#581c87"}}>
                              <strong>AI Response:</strong> {courseDoubtReply}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p>Select a syllabus topic to begin.</p>
                    )}
                  </div>
                </div>

                {/* Instructor Ratings & Comments Forums */}
                <div style={{marginTop: "40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", paddingTop: "24px", borderTop: "1px solid #f1f5f9"}}>
                  {/* Public Q&A Comments */}
                  <div>
                    <h3>Instructor Doubt Board (Q&A)</h3>
                    <div style={{display: "flex", gap: "10px", margin: "12px 0"}}>
                      <input 
                        style={{flex: 1, padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px"}} 
                        placeholder="Post a doubt or public question to the instructor..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                      />
                      <button className="tutor-btn" onClick={postComment}>Post</button>
                    </div>

                    <div style={{maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px"}}>
                      {(selectedCourse.comments || []).length === 0 ? (
                        <p style={{color: "#94a3b8", fontSize: "14px"}}>No comments yet. Ask a question first!</p>
                      ) : (
                        selectedCourse.comments.map((comm, idx) => (
                          <div key={idx} style={{background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0"}}>
                            <div style={{display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b"}}>
                              <strong>{comm.studentName}</strong>
                              <span>{comm.timestamp}</span>
                            </div>
                            <p style={{color: "#1e293b", margin: "6px 0", fontSize: "14px"}}>{comm.text}</p>
                            
                            {/* Instructor replies */}
                            {comm.replies && comm.replies.map((rep, ridx) => (
                              <div key={ridx} style={{marginLeft: "16px", marginTop: "8px", background: "#f0fdf4", borderLeft: "3px solid #10b981", padding: "8px", borderRadius: "6px"}}>
                                <div style={{fontSize: "11px", color: "#166534"}}><strong>Instructor {rep.instructorName}</strong> ({rep.timestamp})</div>
                                <p style={{fontSize: "13px", color: "#14532d", margin: "2px 0"}}>{rep.text}</p>
                              </div>
                            ))}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Feedback Ratings */}
                  <div>
                    <h3>Rate Instructor & Course</h3>
                    <div style={{background: "#fafafb", padding: "16px", borderRadius: "14px", border: "1px solid #cbd5e1", marginTop: "12px"}}>
                      <div style={{display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px"}}>
                        <span style={{fontSize: "14px", color: "#475569"}}>Select Rating:</span>
                        {[1, 2, 3, 4, 5].map(val => (
                          <span 
                            key={val} 
                            onClick={() => setCourseRating(val)}
                            style={{fontSize: "24px", cursor: "pointer", color: val <= courseRating ? "#f59e0b" : "#cbd5e1"}}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <textarea 
                        style={{width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px", minHeight: "80px", marginBottom: "12px", fontFamily: "inherit"}}
                        placeholder="Leave feedback on the teaching style or curriculum..."
                        value={courseFeedback}
                        onChange={(e) => setCourseFeedback(e.target.value)}
                      />
                      <button className="tutor-btn" onClick={submitRating}>Submit Feedback</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB CONTENT 3: NOTES ================= */}
        {currentTab === "notes" && (
          <div>
            <div className="welcome-section" style={{marginBottom: "24px"}}>
              <div>
                <h1>AI Note Analyzer</h1>
                <p>Upload lecture PDFs, slides, or notes to get immediate summaries, questions, and cheat sheets.</p>
              </div>
            </div>

            <div style={{display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px"}}>
              {/* Note uploads & list */}
              <div>
                <div style={{background: "white", padding: "20px", borderRadius: "18px", border: "1px solid #e2e8f0", marginBottom: "20px"}}>
                  <h3>Upload Document</h3>
                  <form onSubmit={handleNoteUpload} style={{marginTop: "12px", display: "flex", flexDirection: "column", gap: "12px"}}>
                    {/* Custom styled file drop area */}
                    <div
                      onClick={() => document.getElementById("note-file-input").click()}
                      style={{
                        border: `2px dashed ${noteFile ? "#5b6ef5" : "#cbd5e1"}`,
                        padding: "28px 16px",
                        borderRadius: "12px",
                        textAlign: "center",
                        cursor: "pointer",
                        background: noteFile ? "#f0f4ff" : "#f8fafc",
                        transition: "all 0.2s"
                      }}
                    >
                      <Upload size={28} color={noteFile ? "#5b6ef5" : "#94a3b8"} style={{margin: "0 auto 10px"}} />
                      {noteFile ? (
                        <div>
                          <div style={{fontWeight: "600", color: "#1e293b", fontSize: "14px"}}>📄 {noteFile.name}</div>
                          <div style={{fontSize: "12px", color: "#64748b", marginTop: "4px"}}>
                            {(noteFile.size / 1024).toFixed(1)} KB · Click to change
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{fontWeight: "600", color: "#334155", fontSize: "14px"}}>Click to select file</div>
                          <div style={{fontSize: "12px", color: "#94a3b8", marginTop: "4px"}}>Supports PDF, DOCX, TXT</div>
                        </div>
                      )}
                    </div>
                    <input
                      id="note-file-input"
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={(e) => setNoteFile(e.target.files[0])}
                      style={{display: "none"}}
                    />
                    {noteFile && (
                      <button
                        type="button"
                        onClick={() => setNoteFile(null)}
                        style={{background: "none", border: "none", color: "#ef4444", fontSize: "12px", cursor: "pointer", alignSelf: "flex-start"}}
                      >
                        ✕ Clear selection
                      </button>
                    )}
                    <button className="tutor-btn" type="submit" disabled={noteLoading || !noteFile}>
                      {noteLoading ? "Analyzing file..." : "Extract & Analyze with AI"}
                    </button>
                  </form>
                </div>


                <div style={{background: "white", padding: "20px", borderRadius: "18px", border: "1px solid #e2e8f0"}}>
                  <h3>My Uploads</h3>
                  <div style={{marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px", maxHeight: "250px", overflowY: "auto"}}>
                    {notesList.length === 0 ? (
                      <p style={{color: "#94a3b8", fontSize: "14px"}}>No uploaded documents yet.</p>
                    ) : (
                      notesList.map((note, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => setSelectedNote(note)}
                          style={{
                            padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", cursor: "pointer",
                            background: selectedNote?._id === note._id ? "#eef2ff" : "white",
                            borderColor: selectedNote?._id === note._id ? "#5b6ef5" : "#e2e8f0"
                          }}
                        >
                          <div style={{fontWeight: "600", fontSize: "14px", color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{note.fileName}</div>
                          <span style={{fontSize: "11px", color: "#64748b"}}>{note.uploadedAt}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Analysis output panels */}
              <div style={{background: "white", padding: "24px", borderRadius: "18px", border: "1px solid #e2e8f0"}}>
                {selectedNote ? (
                  <div>
                    <h2 style={{color: "#0f172a", marginBottom: "16px"}}>Analysis: {selectedNote.fileName}</h2>
                    
                    {/* Inner Tabs */}
                    <div style={{display: "flex", gap: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px", marginBottom: "16px"}}>
                      <button 
                        onClick={() => setNotesActivePane("summary")}
                        style={{
                          background: "none", border: "none", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "600",
                          color: notesActivePane === "summary" ? "#4f46e5" : "#475569",
                          background: notesActivePane === "summary" ? "#eef2ff" : "none"
                        }}
                      >
                        Summary
                      </button>
                      <button 
                        onClick={() => setNotesActivePane("questions")}
                        style={{
                          background: "none", border: "none", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "600",
                          color: notesActivePane === "questions" ? "#4f46e5" : "#475569",
                          background: notesActivePane === "questions" ? "#eef2ff" : "none"
                        }}
                      >
                        Key Questions (Q&A)
                      </button>
                      <button 
                        onClick={() => setNotesActivePane("cheat")}
                        style={{
                          background: "none", border: "none", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "600",
                          color: notesActivePane === "cheat" ? "#4f46e5" : "#475569",
                          background: notesActivePane === "cheat" ? "#eef2ff" : "none"
                        }}
                      >
                        Cheat Sheet
                      </button>
                    </div>

                    <div style={{lineHeight: "1.7", color: "#334155", maxHeight: "400px", overflowY: "auto", paddingRight: "8px"}}>
                      {notesActivePane === "summary" && (
                        <div style={{whiteSpace: "pre-wrap"}}>{selectedNote.summary}</div>
                      )}
                      
                      {notesActivePane === "questions" && (
                        <div>
                          {selectedNote.questions.map((q, idx) => (
                            <div key={idx} style={{marginBottom: "16px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px"}}>
                              <h4 style={{color: "#1e293b", margin: "0 0 6px"}}>Q: {q.question}</h4>
                              <p style={{color: "#4b5563", margin: 0}}><strong>A:</strong> {q.answer}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {notesActivePane === "cheat" && (
                        <div style={{whiteSpace: "pre-wrap"}}>{selectedNote.cheatSheet}</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{textAlign: "center", padding: "60px 0", color: "#64748b"}}>
                    <FileText size={48} style={{margin: "0 auto 12px"}} />
                    <p>No document selected. Please upload and analyze a note.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB CONTENT 4: RESUME ANALYSIS ================= */}
        {currentTab === "resume-analysis" && (
          <div>
            <div className="welcome-section" style={{marginBottom: "24px"}}>
              <div>
                <h1>Career Hub: ATS Matcher & Mock Interview</h1>
                <p>Improve your resume alignment and practice mock interviews using voice/text inputs.</p>
              </div>
            </div>

            {!interviewStarted && (
              <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px"}}>
                {/* ATS Form & Results */}
                <div style={{background: "white", padding: "20px", borderRadius: "18px", border: "1px solid #e2e8f0"}}>
                  <h3>ATS Resume Scanner</h3>
                  <form onSubmit={handleResumeUpload} style={{display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px"}}>
                    <input 
                      type="file" 
                      accept=".pdf,.docx,.txt"
                      onChange={(e) => setResumeFile(e.target.files[0])}
                      style={{padding: "8px", border: "1px solid #e2e8f0", borderRadius: "8px"}}
                    />
                    <textarea 
                      style={{height: "120px", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px", fontFamily: "inherit"}}
                      placeholder="Paste target Job Description details..."
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                    />
                    <button className="tutor-btn" type="submit" disabled={atsLoading}>
                      {atsLoading ? "Scanning ATS match..." : "Scan Match Score"}
                    </button>
                  </form>

                  {atsResult && (
                    <div style={{marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #f1f5f9"}}>
                      <div style={{display: "flex", alignItems: "center", gap: "16px"}}>
                        <div style={{
                          width: "72px", height: "72px", borderRadius: "50%", background: "#eef2ff", border: "4px solid #5b6ef5",
                          display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", fontWeight: "700",
                          fontSize: "20px", color: "#4f46e5"
                        }}>
                          {atsResult.atsScore}%
                        </div>
                        <div>
                          <h4 style={{margin: 0, color: "#1e293b"}}>ATS Compatibility Score</h4>
                          <p style={{fontSize: "13px", color: "#64748b"}}>Based on keyword density & skills matching</p>
                        </div>
                      </div>

                      <div style={{marginTop: "16px"}}>
                        <strong style={{color: "#b91c1c", fontSize: "14px"}}>Missing Keywords:</strong>
                        <div style={{display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px"}}>
                          {atsResult.missingKeywords.map((kw, idx) => (
                            <span key={idx} style={{background: "#fee2e2", color: "#991b1b", padding: "4px 8px", borderRadius: "6px", fontSize: "12px"}}>{kw}</span>
                          ))}
                        </div>
                      </div>

                      <div style={{marginTop: "16px"}}>
                        <strong style={{color: "#1e293b", fontSize: "14px"}}>Recommended Improvements:</strong>
                        <ul style={{fontSize: "13px", color: "#475569", marginLeft: "16px", marginTop: "6px"}}>
                          {atsResult.improvements.map((imp, idx) => (
                            <li key={idx} style={{marginBottom: "4px"}}>{imp}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mock Interview Launch & Results */}
                <div style={{background: "white", padding: "20px", borderRadius: "18px", border: "1px solid #e2e8f0"}}>
                  <h3>Mock Interview Simulator</h3>
                  <p style={{color: "#64748b", margin: "10px 0 20px", fontSize: "14px"}}>
                    Practice dynamic interview questions customized to your resume and the Job Description. Speaks questions aloud and evaluates clarity, confidence, and skill.
                  </p>
                  
                  {jobDescription ? (
                    <button className="tutor-btn" style={{width: "100%", background: "#10b981"}} onClick={startMockInterview}>
                      Launch Virtual Camera Mock Interview
                    </button>
                  ) : (
                    <p style={{background: "#fef3c7", color: "#d97706", padding: "10px", borderRadius: "8px", fontSize: "13px"}}>
                      Please paste a Job Description in the scanner first to customize the interview questions.
                    </p>
                  )}

                  {interviewEvaluation && (
                    <div style={{marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #f1f5f9"}}>
                      <h4 style={{color: "#0f172a"}}>Feedback Report</h4>
                      
                      <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", margin: "12px 0"}}>
                        <div style={{background: "#f8fafc", padding: "8px", borderRadius: "8px", fontSize: "13px"}}>
                          <strong>Technical Score:</strong> {interviewEvaluation.technicalSkills}/100
                        </div>
                        <div style={{background: "#f8fafc", padding: "8px", borderRadius: "8px", fontSize: "13px"}}>
                          <strong>Confidence:</strong> {interviewEvaluation.confidence}/100
                        </div>
                        <div style={{background: "#f8fafc", padding: "8px", borderRadius: "8px", fontSize: "13px"}}>
                          <strong>Communication:</strong> {interviewEvaluation.communication}/100
                        </div>
                        <div style={{background: "#f8fafc", padding: "8px", borderRadius: "8px", fontSize: "13px"}}>
                          <strong>Clarity:</strong> {interviewEvaluation.clarity}/100
                        </div>
                      </div>

                      <div style={{marginTop: "12px", background: "#ecfdf5", padding: "12px", borderRadius: "8px", borderLeft: "4px solid #10b981"}}>
                        <strong>Suggestions:</strong>
                        <ul style={{fontSize: "13px", color: "#065f46", marginLeft: "14px", marginTop: "4px"}}>
                          {interviewEvaluation.suggestions.map((sug, idx) => <li key={idx}>{sug}</li>)}
                        </ul>
                      </div>
                      {recordedVideoUrl && (
                        <div style={{marginTop: "16px", background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #cbd5e1"}}>
                          <strong style={{color: "#0f172a", fontSize: "14px", display: "block", marginBottom: "8px"}}>📹 Practice Session Recording:</strong>
                          <video src={recordedVideoUrl} controls style={{width: "100%", borderRadius: "8px", border: "1px solid #e2e8f0"}} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Active Interview Panel */}
            {interviewStarted && (
              <div style={{background: "white", padding: "24px", borderRadius: "20px", border: "1px solid #e2e8f0", marginTop: "20px"}}>
                
                {/* Interview Header: Timer + Status Indicators */}
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", padding: "12px 16px", background: "#f8fafc", borderRadius: "12px"}}>
                  <div style={{display: "flex", alignItems: "center", gap: "16px"}}>
                    <span style={{fontWeight: "700", fontSize: "20px", fontFamily: "monospace", color: "#1e293b"}}>
                      ⏱ {formatTimer(interviewTimer)}
                    </span>
                    {interviewPaused && <span style={{background: "#fef3c7", color: "#d97706", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "600"}}>⏸ PAUSED</span>}
                  </div>
                  <div style={{display: "flex", alignItems: "center", gap: "12px"}}>
                    {/* Camera status */}
                    <div style={{display: "flex", alignItems: "center", gap: "6px", fontSize: "12px"}}>
                      <div style={{width: "8px", height: "8px", borderRadius: "50%", background: cameraError ? "#ef4444" : "#10b981"}} />
                      <span style={{color: cameraError ? "#ef4444" : "#10b981", fontWeight: "600"}}>{cameraError ? "No Camera" : "Camera Live"}</span>
                    </div>
                    {/* Mic status */}
                    <div style={{display: "flex", alignItems: "center", gap: "6px", fontSize: "12px"}}>
                      <div style={{width: "8px", height: "8px", borderRadius: "50%", background: isRecording ? "#ef4444" : "#94a3b8"}} />
                      <span style={{color: isRecording ? "#ef4444" : "#94a3b8", fontWeight: "600"}}>{isRecording ? "Mic Active" : "Mic Off"}</span>
                    </div>
                    <button onClick={toggleInterviewPause} style={{background: interviewPaused ? "#10b981" : "#f59e0b", color: "white", border: "none", padding: "6px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "600"}}>
                      {interviewPaused ? "▶ Resume" : "⏸ Pause"}
                    </button>
                    <button onClick={endInterviewEarly} style={{background: "#ef4444", color: "white", border: "none", padding: "6px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "600"}}>
                      ✕ End Interview
                    </button>
                  </div>
                </div>

                <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px"}}>
                  {/* Webcam view */}
                  <div style={{background: "#0f172a", height: "340px", borderRadius: "16px", display: "flex", flexDirection: "column", justifyContent: "center", position: "relative", overflow: "hidden"}}>
                    {cameraError ? (
                      <div style={{textAlign: "center", padding: "20px", color: "white"}}>
                        <div style={{fontSize: "48px", marginBottom: "12px"}}>📷</div>
                        <p style={{fontSize: "14px", color: "#94a3b8"}}>{cameraError}</p>
                        <button onClick={() => { setCameraError(null); }} style={{marginTop: "12px", background: "#5b6ef5", color: "white", border: "none", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "12px"}}>
                          Retry Camera
                        </button>
                      </div>
                    ) : (
                      <>
                        <video ref={videoRef} autoPlay playsInline muted style={{width: "100%", height: "100%", objectFit: "cover"}} />
                        <div style={{position: "absolute", bottom: "12px", left: "12px", background: "rgba(0,0,0,0.6)", color: "white", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px"}}>
                          <span style={{width: "7px", height: "7px", borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "pulse-mic 1.5s infinite"}} />
                          Live Camera
                        </div>
                      </>
                    )}
                  </div>

                  {/* Questions pane */}
                  <div style={{display: "flex", flexDirection: "column", justifyContent: "space-between"}}>
                    {interviewQuestionsLoading ? (
                      <div style={{display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "12px"}}>
                        <div style={{width: "36px", height: "36px", border: "4px solid #f1f5f9", borderTopColor: "#5b6ef5", borderRadius: "50%", animation: "spin 1s linear infinite"}} />
                        <p style={{color: "#64748b", fontSize: "14px"}}>Generating interview questions...</p>
                      </div>
                    ) : (
                      <>
                        <div>
                          <span style={{fontSize: "13px", color: "#5b6ef5", fontWeight: "600"}}>Question {currentQuestionIdx + 1} of {interviewQuestions.length}</span>
                          <div style={{display: "flex", gap: "4px", marginTop: "8px", marginBottom: "12px"}}>
                            {interviewQuestions.map((_, i) => (
                              <div key={i} style={{height: "4px", flex: 1, borderRadius: "2px", background: i < currentQuestionIdx ? "#10b981" : i === currentQuestionIdx ? "#5b6ef5" : "#e2e8f0"}} />
                            ))}
                          </div>
                          <h2 style={{color: "#1e293b", margin: "0 0 16px", fontSize: "18px", lineHeight: "1.5"}}>{interviewQuestions[currentQuestionIdx]}</h2>
                          
                          <div style={{marginBottom: "16px", display: "flex", gap: "8px"}}>
                            <button 
                              onClick={() => speakQuestion(interviewQuestions[currentQuestionIdx])}
                              style={{background: "#eef2ff", border: "none", color: "#4f46e5", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px"}}
                            >
                              <Volume2 size={13} /> Speak
                            </button>
                            <label style={{display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#64748b", cursor: "pointer"}}>
                              <input type="checkbox" checked={voiceEnabled} onChange={(e) => setVoiceEnabled(e.target.checked)} style={{width: "auto"}} /> Auto-speak
                            </label>
                          </div>

                          <textarea 
                            style={{width: "100%", height: "110px", padding: "12px", border: "1px solid #cbd5e1", borderRadius: "10px", fontFamily: "inherit", resize: "none", boxSizing: "border-box"}}
                            placeholder="Type your response here..."
                            value={answerText}
                            onChange={(e) => setAnswerText(e.target.value)}
                            disabled={interviewPaused}
                          />
                        </div>

                        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", gap: "8px"}}>
                          <button 
                            onClick={handleVoiceAnswer}
                            disabled={interviewPaused}
                            style={{
                              background: isRecording ? "#ef4444" : "#eef2ff",
                              color: isRecording ? "white" : "#4f46e5",
                              border: "none", padding: "10px 16px", borderRadius: "10px", cursor: "pointer",
                              display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", fontSize: "13px",
                              animation: isRecording ? "pulse-mic 1.5s infinite" : "none"
                            }}
                          >
                            {isRecording ? <MicOff size={15} /> : <Mic size={15} />}
                            {isRecording ? "Stop Recording" : "Record Answer"}
                          </button>
                          <button className="tutor-btn" onClick={submitQuestionAnswer} disabled={interviewPaused}>
                            {currentQuestionIdx + 1 === interviewQuestions.length ? "Finish & Evaluate" : "Next →"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            
            {evaluatingInterview && (
              <div className="modal-overlay">
                <div className="modal" style={{textAlign: "center"}}>
                  <h2>Analyzing Responses</h2>
                  <p>AI is reviewing your answers for communication clarity, technical expertise, and confidence levels...</p>
                  <div style={{margin: "20px auto", width: "40px", height: "40px", border: "4px solid #f3f4f6", borderTopColor: "#5b6ef5", borderRadius: "50%", animation: "spin 1s linear infinite"}} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB CONTENT 5: STUDY PLANNER ================= */}
        {currentTab === "study-planner" && (
          <div>
            <div className="welcome-section" style={{marginBottom: "24px"}}>
              <div>
                <h1>Dynamic Study Planner</h1>
                <p>Add study goals manually, configure Pomodoro blocks, or generate an AI road plan roadmap.</p>
              </div>
            </div>

            <div style={{display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px"}}>
              {/* Left Side: Tasks & Roadmaps */}
              <div>
                {/* Manual Task List */}
                <div style={{background: "white", padding: "20px", borderRadius: "18px", border: "1px solid #e2e8f0", marginBottom: "20px"}}>
                  <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px"}}>
                    <h3>My Today Tasks</h3>
                    <button className="tutor-btn" onClick={() => { setEditingTaskId(null); setShowManualModal(true); }}>+ Add Task</button>
                  </div>

                  <div style={{display: "flex", flexDirection: "column", gap: "10px"}}>
                    {plannerTasks.length === 0 ? (
                      <p style={{color: "#94a3b8", fontSize: "14px"}}>No tasks scheduled for today.</p>
                    ) : (
                      plannerTasks.map((task, idx) => (
                        <div key={idx} style={{
                          padding: "12px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", background: task.status === "Completed" ? "#f0fdf4" : "white",
                          display: "flex", justifyContent: "space-between", alignItems: "center"
                        }}>
                          <div>
                            <h4 style={{textDecoration: task.status === "Completed" ? "line-through" : "none", color: "#1e293b"}}>{task.title}</h4>
                            <span style={{fontSize: "12px", color: "#64748b"}}>{task.startTime} - {task.endTime} ({task.course})</span>
                          </div>
                          <div style={{display: "flex", gap: "8px", alignItems: "center"}}>
                            <span style={{
                              fontSize: "11px", padding: "2px 6px", borderRadius: "999px",
                              background: task.priority === "High" ? "#fee2e2" : task.priority === "Medium" ? "#fef3c7" : "#d1fae5",
                              color: task.priority === "High" ? "#ef4444" : task.priority === "Medium" ? "#f59e0b" : "#10b981"
                            }}>{task.priority}</span>
                            
                            {task.status !== "Completed" && (
                              <button onClick={() => handleCompleteTask(task._id)} style={{background: "none", border: "none", color: "#10b981", cursor: "pointer"}} title="Mark Complete"><CheckCircle size={16} /></button>
                            )}
                            <button onClick={() => startTaskEdit(task)} style={{background: "none", border: "none", color: "#3b82f6", cursor: "pointer"}} title="Edit"><Edit3 size={15} /></button>
                            <button onClick={() => handleDeleteTask(task._id)} style={{background: "none", border: "none", color: "#ef4444", cursor: "pointer"}} title="Delete"><Trash2 size={15} /></button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* AI generated plan */}
                <div style={{background: "white", padding: "20px", borderRadius: "18px", border: "1px solid #e2e8f0"}}>
                  <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px"}}>
                    <h3>AI Roadmap Planner</h3>
                    {aiPlanTasks.length > 0 && <button className="tutor-btn" style={{background: "#ef4444"}} onClick={deleteAIPlan}>Delete Plan</button>}
                  </div>

                  {aiPlanTasks.length === 0 ? (
                    <div>
                      <p style={{fontSize: "14px", color: "#64748b", marginBottom: "12px"}}>Input study parameters to build a customized, daily structured roadmap.</p>
                      <div style={{display: "flex", flexDirection: "column", gap: "10px"}}>
                        <div>
                          <label style={{fontSize: "12px", color: "#475569", display: "block", marginBottom: "4px", fontWeight: "600"}}>Course / Subject Name</label>
                          <input style={{width: "100%", padding: "10px", border: "1px solid #e2e8f0", borderRadius: "8px", boxSizing: "border-box"}} placeholder="e.g. Intro to Machine Learning" value={plannerCourse} onChange={(e) => setPlannerCourse(e.target.value)} />
                        </div>
                        <div>
                          <label style={{fontSize: "12px", color: "#475569", display: "block", marginBottom: "4px", fontWeight: "600"}}>Study Goal / Target</label>
                          <textarea style={{width: "100%", padding: "10px", border: "1px solid #e2e8f0", borderRadius: "8px", height: "60px", fontFamily: "inherit", boxSizing: "border-box"}} placeholder="e.g. Learn core algorithms and pass final exam" value={plannerGoal} onChange={(e) => setPlannerGoal(e.target.value)} />
                        </div>
                        <div style={{display: "flex", gap: "10px"}}>
                          <div style={{flex: 1}}>
                            <label style={{fontSize: "12px", color: "#475569", display: "block", marginBottom: "4px", fontWeight: "600"}}>Start Date</label>
                            <input type="date" style={{width: "100%", padding: "10px", border: "1px solid #e2e8f0", borderRadius: "8px", boxSizing: "border-box"}} value={plannerStartDate} onChange={(e) => setPlannerStartDate(e.target.value)} />
                          </div>
                          <div style={{flex: 1}}>
                            <label style={{fontSize: "12px", color: "#475569", display: "block", marginBottom: "4px", fontWeight: "600"}}>End Date / Target</label>
                            <input type="date" style={{width: "100%", padding: "10px", border: "1px solid #e2e8f0", borderRadius: "8px", boxSizing: "border-box"}} value={plannerDeadline} onChange={(e) => setPlannerDeadline(e.target.value)} />
                          </div>
                        </div>
                        <div style={{display: "flex", gap: "10px"}}>
                          <div style={{flex: 1}}>
                            <label style={{fontSize: "12px", color: "#475569", display: "block", marginBottom: "4px", fontWeight: "600"}}>Daily Duration</label>
                            <input type="number" style={{width: "100%", padding: "10px", border: "1px solid #e2e8f0", borderRadius: "8px", boxSizing: "border-box"}} placeholder="Hours/day" value={plannerHours} onChange={(e) => setPlannerHours(e.target.value)} />
                          </div>
                          <div style={{flex: 1}}>
                            <label style={{fontSize: "12px", color: "#475569", display: "block", marginBottom: "4px", fontWeight: "600"}}>Learning Level</label>
                            <select style={{width: "100%", padding: "10px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "white", boxSizing: "border-box"}} value={plannerLevel} onChange={(e) => setPlannerLevel(e.target.value)}>
                              <option value="Beginner">Beginner</option>
                              <option value="Intermediate">Intermediate</option>
                              <option value="Advanced">Advanced</option>
                            </select>
                          </div>
                        </div>
                        <button className="tutor-btn" onClick={generateAIPlanner} disabled={aiPlanLoading || !plannerCourse || !plannerStartDate || !plannerDeadline}>
                          {aiPlanLoading ? "Generating Roadmap..." : "Generate AI Roadmap"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{maxHeight: "350px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px"}}>
                      {aiPlanTasks.map((t, idx) => (
                        <div key={idx} style={{
                          padding: "16px", border: "1px solid #f1f5f9", borderRadius: "12px",
                          background: t.completed ? "#f0fdf4" : "#f8fafc",
                          display: "flex", flexDirection: "column", gap: "8px"
                        }}>
                          {t.milestone && (
                            <div style={{
                              alignSelf: "flex-start", background: "#fef3c7", color: "#b45309",
                              fontSize: "11px", padding: "4px 8px", borderRadius: "6px", fontWeight: "700"
                            }}>
                              🏆 {t.milestone}
                            </div>
                          )}
                          <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px"}}>
                            <div style={{flex: 1}}>
                              <span style={{fontSize: "11px", fontWeight: "600", color: "#5b6ef5"}}>DAY {idx + 1} ({t.date})</span>
                              <h4 style={{margin: "4px 0", color: "#1e293b", textDecoration: t.completed ? "line-through" : "none"}}>{t.topic}</h4>
                              {t.dailyTask && <p style={{fontSize: "13px", color: "#4b5563", margin: "4px 0"}}>{t.dailyTask}</p>}
                              <span style={{fontSize: "12px", color: "#64748b", fontWeight: "500"}}>⏰ Allocation: {t.timeAllocation || `${t.duration} hours`}</span>
                            </div>
                            <button 
                              disabled={t.completed} 
                              onClick={() => completeAIPlanTopic(idx)}
                              style={{
                                padding: "6px 12px", borderRadius: "8px", border: "none", cursor: "pointer",
                                background: t.completed ? "#10b981" : "#eef2ff",
                                color: t.completed ? "white" : "#4f46e5",
                                fontSize: "12px", fontWeight: "600"
                              }}
                            >
                              {t.completed ? "✓ Complete" : "Mark Done"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Pomodoro Timer widget */}
              <div style={{background: "white", padding: "24px", borderRadius: "18px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"}}>
                <Clock size={40} color="#5b6ef5" />
                <h2 style={{margin: "12px 0 4px"}}>Pomodoro Focus Blocks</h2>
                <span style={{background: pomoMode === "Work" ? "#fee2e2" : "#d1fae5", color: pomoMode === "Work" ? "#b91c1c" : "#065f46", padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "600", marginBottom: "20px"}}>
                  Mode: {pomoMode} Session
                </span>

                <div style={{fontSize: "64px", fontWeight: "700", color: "#1f2937", fontFamily: "monospace", margin: "10px 0"}}>
                  {String(pomoMinutes).padStart(2, "0")}:{String(pomoSeconds).padStart(2, "0")}
                </div>

                <div style={{display: "flex", gap: "12px", margin: "20px 0"}}>
                  <button 
                    onClick={() => setPomoRunning(!pomoRunning)} 
                    style={{
                      background: pomoRunning ? "#ef4444" : "#10b981", color: "white",
                      border: "none", padding: "10px 20px", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontWeight: "600"
                    }}
                  >
                    {pomoRunning ? <Pause size={14} /> : <Play size={14} />} {pomoRunning ? "Pause" : "Start"}
                  </button>
                  <button 
                    onClick={() => { setPomoRunning(false); setPomoMinutes(pomoMode === "Work" ? 25 : 5); setPomoSeconds(0); }} 
                    style={{
                      background: "#e2e8f0", color: "#475569",
                      border: "none", padding: "10px 20px", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontWeight: "600"
                    }}
                  >
                    <RotateCcw size={14} /> Reset
                  </button>
                </div>

                <div style={{display: "flex", gap: "10px", fontSize: "13px", color: "#64748b"}}>
                  <label style={{cursor: "pointer"}}>
                    <input type="checkbox" checked={pomoSound} onChange={(e) => setPomoSound(e.target.checked)} /> Alarm sound enabled
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB CONTENT 6: QUIZZES ================= */}
        {currentTab === "quizzes" && (
          <div>
            <div className="welcome-section" style={{marginBottom: "24px"}}>
              <div>
                <h1>Lumina Smart Quizzes</h1>
                <p>Generate assessments dynamically on any topic or upload note attachments for instant tests.</p>
              </div>
            </div>

            <div style={{display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px"}}>
              {/* Quiz Generation panel */}
              <div>
                <div style={{background: "white", padding: "20px", borderRadius: "18px", border: "1px solid #e2e8f0", marginBottom: "20px"}}>
                  <h3>Generate Quiz</h3>
                  <form onSubmit={handleGenerateQuiz} style={{marginTop: "12px", display: "flex", flexDirection: "column", gap: "12px"}}>
                    <input 
                      style={{padding: "10px", border: "1px solid #e2e8f0", borderRadius: "8px"}} 
                      placeholder="Enter study topic (e.g. Data Structures)..." 
                      value={quizTopic}
                      onChange={(e) => setQuizTopic(e.target.value)}
                    />
                    <div style={{border: "1px dashed #cbd5e1", padding: "12px", borderRadius: "8px", textAlign: "center"}}>
                      <span style={{fontSize: "12px", color: "#64748b"}}>Or upload document to test content</span>
                      <input 
                        type="file" 
                        accept=".pdf,.docx,.txt"
                        onChange={(e) => setQuizFile(e.target.files[0])}
                        style={{display: "block", fontSize: "11px", margin: "6px auto"}}
                      />
                    </div>
                    <button className="tutor-btn" type="submit" disabled={quizLoading || (!quizTopic.trim() && !quizFile)}>
                      {quizLoading ? "Generating AI Quiz..." : "Create AI Quiz"}
                    </button>
                  </form>
                </div>

                <div style={{background: "white", padding: "20px", borderRadius: "18px", border: "1px solid #e2e8f0"}}>
                  <h3>Attempt History</h3>
                  <div style={{marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px", maxHeight: "250px", overflowY: "auto"}}>
                    {quizHistory.length === 0 ? (
                      <p style={{color: "#94a3b8", fontSize: "14px"}}>No historical attempts logged.</p>
                    ) : (
                      quizHistory.map((item, idx) => (
                        <div key={idx} style={{padding: "10px", border: "1px solid #f1f5f9", borderRadius: "8px", display: "flex", justifyContent: "space-between"}}>
                          <div>
                            <div style={{fontWeight: "600", fontSize: "13px", color: "#1e293b"}}>{item.title}</div>
                            <span style={{fontSize: "11px", color: "#64748b"}}>{item.date}</span>
                          </div>
                          <span style={{fontWeight: "700", color: item.score >= 60 ? "#10b981" : "#ef4444"}}>{item.score}%</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Active Quiz Sheet */}
              <div style={{background: "white", padding: "24px", borderRadius: "18px", border: "1px solid #e2e8f0"}}>
                {generatedQuiz ? (
                  <div>
                    <h2 style={{color: "#0f172a", marginBottom: "16px"}}>{generatedQuiz.title}</h2>
                    {quizGrade !== null ? (
                      <div style={{textAlign: "center", padding: "30px"}}>
                        <h1 style={{fontSize: "64px", color: quizGrade >= 60 ? "#10b981" : "#ef4444"}}>{quizGrade}%</h1>
                        <h3>{quizGrade >= 60 ? "Congratulations, you passed! 🎉" : "You did not pass. Try again! ❌"}</h3>
                        <button className="tutor-btn" style={{marginTop: "20px"}} onClick={() => setGeneratedQuiz(null)}>Try Another Quiz</button>
                      </div>
                    ) : (
                      <div>
                        {generatedQuiz.questions.map((q, qidx) => (
                          <div key={qidx} style={{marginBottom: "20px", borderBottom: "1px solid #f1f5f9", paddingBottom: "16px"}}>
                            <h4 style={{color: "#1e293b", marginBottom: "10px"}}>{qidx + 1}. {q.question}</h4>
                            <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
                              {q.options.map((opt, oidx) => (
                                <label key={oidx} style={{display: "flex", alignItems: "center", gap: "10px", padding: "8px", background: "#f8fafc", borderRadius: "8px", cursor: "pointer", fontSize: "14px"}}>
                                  <input 
                                    type="radio" 
                                    name={`act_q_${qidx}`} 
                                    checked={quizAnswers[qidx] === oidx}
                                    onChange={() => setQuizAnswers(prev => ({ ...prev, [qidx]: oidx }))}
                                  />
                                  {opt}
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                        <button className="tutor-btn" style={{width: "100%"}} onClick={submitQuizAnswers}>Submit Quiz Answers</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{textAlign: "center", padding: "60px 0", color: "#64748b"}}>
                    <HelpCircle size={48} style={{margin: "0 auto 12px"}} />
                    <p>Configure options and click generate to launch an AI Quiz panel.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB CONTENT 7: AI TUTOR ================= */}
        {currentTab === "ai-tutor" && (
          <div>
            <div className="welcome-section" style={{marginBottom: "24px"}}>
              <div>
                <h1>Lumina Personal AI Tutor</h1>
                <p>Ask questions by voice or text. Snap a photo of notes for visual doubt solving. Hear answers read aloud.</p>
              </div>
            </div>

            <div style={{display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px"}}>
              {/* Chat board */}
              <div style={{background: "white", borderRadius: "18px", border: "1px solid #e2e8f0", padding: "20px", display: "flex", flexDirection: "column", minHeight: "540px"}}>
                
                {/* TTS Controls (show when tutorVoiceOutput is on) */}
                {tutorVoiceOutput && (
                  <div style={{display: "flex", gap: "8px", marginBottom: "12px", padding: "8px 12px", background: "#f5f3ff", borderRadius: "10px", alignItems: "center"}}>
                    <span style={{fontSize: "12px", color: "#7c3aed", fontWeight: "600"}}>🔊 Speaker:</span>
                    {ttsState === "playing" ? (
                      <button onClick={pauseTTS} style={{background: "#7c3aed", color: "white", border: "none", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600"}}>
                        ⏸ Pause
                      </button>
                    ) : ttsState === "paused" ? (
                      <button onClick={resumeTTS} style={{background: "#ede9fe", color: "#7c3aed", border: "none", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600"}}>
                        ▶ Resume
                      </button>
                    ) : (
                      <button onClick={playTTS} style={{background: "#ede9fe", color: "#7c3aed", border: "none", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600"}}>
                        ▶ Play
                      </button>
                    )}
                    <button onClick={stopTTS} style={{background: "#ede9fe", color: "#7c3aed", border: "none", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600"}}>
                      ⏹ Stop
                    </button>
                  </div>
                )}

                {/* Messages */}
                <div style={{flex: 1, overflowY: "auto", paddingRight: "8px", display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px"}}>
                  {tutorMessages.map((msg, idx) => (
                    <div 
                      key={idx} 
                      style={{
                        alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                        background: msg.role === "user" ? "#5b6ef5" : "#f1f5f9",
                        color: msg.role === "user" ? "white" : "#1f2937",
                        padding: "12px 16px", borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                        maxWidth: "80%", fontSize: "14px", lineHeight: "1.6",
                        whiteSpace: "pre-wrap", animation: "fadeIn 0.2s ease"
                      }}
                    >
                      {msg.content}
                      {msg.role === "assistant" && tutorVoiceOutput && (
                        <button onClick={() => speakTutorReply(msg.content)} style={{display: "block", marginTop: "6px", background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "11px", padding: 0}}>
                          🔊 Read aloud
                        </button>
                      )}
                    </div>
                  ))}
                  {tutorLoading && (
                    <div style={{alignSelf: "flex-start", background: "#f1f5f9", padding: "12px 16px", borderRadius: "14px 14px 14px 4px", display: "flex", gap: "6px", alignItems: "center"}}>
                      <div style={{width: "7px", height: "7px", borderRadius: "50%", background: "#94a3b8", animation: "pulse-mic 1s infinite"}} />
                      <div style={{width: "7px", height: "7px", borderRadius: "50%", background: "#94a3b8", animation: "pulse-mic 1s 0.2s infinite"}} />
                      <div style={{width: "7px", height: "7px", borderRadius: "50%", background: "#94a3b8", animation: "pulse-mic 1s 0.4s infinite"}} />
                    </div>
                  )}
                  <div ref={tutorChatBottomRef} />
                </div>

                {/* Input Bar */}
                <div style={{borderTop: "1px solid #f1f5f9", paddingTop: "12px"}}>
                  {/* Mic status banner */}
                  {tutorMicState === "listening" && (
                    <div style={{marginBottom: "8px", padding: "6px 12px", background: "#fee2e2", borderRadius: "8px", fontSize: "12px", color: "#ef4444", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px"}}>
                      <span style={{width: "7px", height: "7px", borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "pulse-mic 1s infinite"}} />
                      Listening... Speak your question
                    </div>
                  )}
                  {tutorMicState === "processing" && (
                    <div style={{marginBottom: "8px", padding: "6px 12px", background: "#fef3c7", borderRadius: "8px", fontSize: "12px", color: "#d97706", fontWeight: "600"}}>
                      ⚡ Processing voice input...
                    </div>
                  )}

                  <div style={{display: "flex", gap: "8px", alignItems: "flex-end"}}>
                    {/* Mic button with state */}
                    <button 
                      onClick={handleTutorVoiceInput} 
                      title={tutorMicState === "listening" ? "Stop listening" : "Start voice input"}
                      style={{
                        background: tutorMicState === "listening" ? "#ef4444" : tutorMicState === "processing" ? "#f59e0b" : "#eef2ff",
                        border: "none", borderRadius: "10px", padding: "11px",
                        cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center",
                        animation: tutorMicState === "listening" ? "pulse-mic 1.5s infinite" : "none",
                        color: tutorMicState === "idle" ? "#4f46e5" : "white"
                      }}
                    >
                      <Mic size={18} />
                    </button>

                    <input 
                      style={{flex: 1, padding: "11px 14px", border: "1px solid #cbd5e1", borderRadius: "10px", background: "white", color: "#1e293b"}} 
                      placeholder={tutorMicState === "listening" ? "Listening for your voice..." : "Type your question or press mic..."}
                      value={tutorInput}
                      onChange={(e) => setTutorInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendTutorMessage(); } }}
                    />
                    <button className="tutor-btn" onClick={handleSendTutorMessage} style={{flexShrink: 0, padding: "11px 16px"}}>
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Tutor sidebar: Visual Doubts + Settings */}
              <div style={{display: "flex", flexDirection: "column", gap: "16px"}}>
                {/* Visual Input Card */}
                <div style={{background: "white", padding: "20px", borderRadius: "18px", border: "1px solid #e2e8f0"}}>
                  <h3 style={{margin: "0 0 6px"}}>Visual Doubt Solver</h3>
                  <p style={{fontSize: "13px", color: "#64748b", margin: "0 0 16px"}}>Snap or upload a photo of notes, slides, or formulas for AI analysis.</p>

                  {/* Camera active view */}
                  {showTutorCam && (
                    <div style={{marginBottom: "12px"}}>
                      <video ref={tutorVideoRef} autoPlay playsInline muted style={{width: "100%", borderRadius: "12px", background: "#0f172a", display: "block"}} />
                      <div style={{display: "flex", gap: "8px", marginTop: "8px"}}>
                        <button className="tutor-btn" style={{flex: 1}} onClick={captureTutorSnap}>📸 Capture</button>
                        <button onClick={stopTutorCamera} style={{background: "#f1f5f9", border: "none", padding: "8px 14px", borderRadius: "10px", cursor: "pointer", color: "#475569", fontWeight: "600"}}>✕</button>
                      </div>
                    </div>
                  )}

                  {/* Camera error */}
                  {tutorCameraError && (
                    <div style={{padding: "10px", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fecaca", fontSize: "13px", color: "#b91c1c", marginBottom: "12px"}}>
                      ⚠️ {tutorCameraError}
                    </div>
                  )}

                  {/* Image preview */}
                  {capturedSnap && !showTutorCam && (
                    <div style={{marginBottom: "12px", position: "relative"}}>
                      <img src={capturedSnap} style={{width: "100%", borderRadius: "12px", border: "2px solid #5b6ef5", display: "block"}} alt="Visual context" />
                      <div style={{marginTop: "6px", display: "flex", gap: "6px"}}>
                        <span style={{fontSize: "12px", color: "#5b6ef5", fontWeight: "600"}}>✓ Image ready to send</span>
                        <button onClick={() => { setCapturedSnap(null); setTutorImageFile(null); }} style={{background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "12px"}}>Remove</button>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  {!showTutorCam && (
                    <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
                      <button 
                        onClick={startTutorCamera}
                        style={{background: "#f8fafc", border: "1px solid #e2e8f0", color: "#334155", padding: "10px", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"}}
                      >
                        <Camera size={15} /> Open Camera
                      </button>
                      <button 
                        onClick={() => tutorImageInputRef.current?.click()}
                        style={{background: "#f8fafc", border: "1px solid #e2e8f0", color: "#334155", padding: "10px", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"}}
                      >
                        <Upload size={15} /> Upload Image
                      </button>
                      <input ref={tutorImageInputRef} type="file" accept="image/*" onChange={handleTutorImageUpload} style={{display: "none"}} />
                    </div>
                  )}
                </div>

                {/* Tutor Settings Card */}
                <div style={{background: "white", padding: "20px", borderRadius: "18px", border: "1px solid #e2e8f0"}}>
                  <h3 style={{margin: "0 0 14px"}}>Tutor Settings</h3>
                  <div style={{marginBottom: "10px"}}>
                    <div style={{fontWeight: "600", fontSize: "14px", color: "#334155", marginBottom: "6px"}}>Tutor Voice Mode</div>
                    <select 
                      value={tutorVoiceOutput ? "text-voice" : "text-only"} 
                      onChange={(e) => {
                        const isVoice = e.target.value === "text-voice";
                        setTutorVoiceOutput(isVoice);
                        if (!isVoice) {
                          stopTTS();
                        }
                      }} 
                      style={{width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px", background: "white"}}
                    >
                      <option value="text-only">📝 Text Only</option>
                      <option value="text-voice">🔊 Text + Voice</option>
                    </select>
                  </div>
                  <div style={{fontSize: "12px", color: "#94a3b8", paddingTop: "10px", borderTop: "1px solid #f1f5f9"}}>
                    💡 Tip: Press Enter to send. Shift+Enter for new line.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* ================= TAB CONTENT 8: PROMPT GAME ================= */}
        {currentTab === "prompt-game" && (
          <div>
            <div className="welcome-section" style={{marginBottom: "24px"}}>
              <div>
                <h1>AI Prompt Engineering Game</h1>
                <p>Analyze reference visuals and type high-fidelity prompts to generate matching outputs. Grades triggers and detail.</p>
              </div>
            </div>

            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px"}}>
              {/* Game workspace */}
              <div style={{background: "white", padding: "24px", borderRadius: "18px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", justifyContent: "space-between"}}>
                {!gameActive && !gameResult ? (
                  <div style={{textAlign: "center", padding: "40px 0"}}>
                    <Award size={48} color="#f59e0b" style={{margin: "0 auto 12px"}} />
                    <h3>Ready for the Challenge?</h3>
                    <p style={{color: "#64748b", margin: "10px 0 20px"}}>You will be given a target image theme. Craft the best text prompt within 60 seconds.</p>
                    <button className="tutor-btn" onClick={startPromptGame}>Start Prompt Game</button>
                  </div>
                ) : (
                  <div>
                    <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px"}}>
                      <h3 style={{color: "#1e293b"}}>Challenge: {promptGameImage.name}</h3>
                      {gameActive && (
                        <span style={{background: "#fee2e2", color: "#ef4444", padding: "4px 10px", borderRadius: "6px", fontWeight: "700"}}>
                          ⏱ {gameTimer}s
                        </span>
                      )}
                    </div>
                    
                    <div style={{background: "#f1f5f9", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "20px"}}>
                      <strong>Goal:</strong> Describe a text prompt that would render:
                      <p style={{margin: "6px 0", color: "#475569"}}>"{promptGameImage.desc}"</p>
                    </div>

                    <textarea 
                      style={{width: "100%", height: "120px", padding: "12px", border: "1px solid #cbd5e1", borderRadius: "10px", fontFamily: "inherit"}}
                      placeholder="Type details, lighting styles, camera settings, and modifiers..."
                      value={gamePromptInput}
                      onChange={(e) => setGamePromptInput(e.target.value)}
                      disabled={!gameActive}
                    />

                    <button className="tutor-btn" style={{width: "100%", marginTop: "14px"}} onClick={submitGamePrompt} disabled={!gameActive || gameLoading}>
                      {gameLoading ? "Grading prompt..." : "Submit for AI Evaluation"}
                    </button>
                  </div>
                )}

                {gameResult && (
                  <div style={{marginTop: "20px", borderTop: "1px solid #f1f5f9", paddingTop: "20px"}}>
                    <div style={{display: "flex", gap: "20px"}}>
                      <div>
                        <div style={{fontSize: "24px", fontWeight: "700", color: "#5b6ef5"}}>{gameResult.score}/100</div>
                        <span style={{fontSize: "12px", color: "#64748b"}}>Overall Quality</span>
                      </div>
                      <div>
                        <div style={{fontSize: "24px", fontWeight: "700", color: "#10b981"}}>{gameResult.similarity}%</div>
                        <span style={{fontSize: "12px", color: "#64748b"}}>Similarity</span>
                      </div>
                    </div>
                    <p style={{fontSize: "13px", color: "#475569", margin: "12px 0"}}><strong>AI Review:</strong> {gameResult.feedback}</p>
                    <div style={{background: "#f0fdf4", padding: "10px", borderRadius: "8px", border: "1px solid #bbf7d0"}}>
                      <strong>Better Example:</strong>
                      <p style={{fontSize: "13px", color: "#166534", margin: "4px 0"}}>{gameResult.betterExample}</p>
                    </div>
                    <button className="tutor-btn" style={{background: "#475569", width: "100%", marginTop: "12px"}} onClick={startPromptGame}>Play Again</button>
                  </div>
                )}
              </div>

              {/* Game info & Reference image */}
              <div style={{background: "white", padding: "20px", borderRadius: "18px", border: "1px solid #e2e8f0"}}>
                <h3>Reference Image Card</h3>
                {gameActive || gameResult ? (
                  <div style={{marginTop: "16px"}}>
                    <img src={promptGameImage.url} style={{width: "100%", borderRadius: "12px", height: "220px", objectFit: "cover"}} alt="Game reference image" />
                  </div>
                ) : (
                  <p style={{color: "#64748b", marginTop: "12px"}}>Start a game session to view challenge image guides.</p>
                )}

                <div style={{marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #f1f5f9"}}>
                  <h3>My Game History</h3>
                  <div style={{maxHeight: "180px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px"}}>
                    {gameHistory.map((item, idx) => (
                      <div key={idx} style={{fontSize: "12px", display: "flex", justifyContent: "space-between", padding: "6px", borderBottom: "1px solid #f3f4f6"}}>
                        <span>{item.imageName}</span>
                        <strong>Score: {item.score}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB CONTENT 9: PROGRESS ================= */}
        {currentTab === "progress" && progressData && (
          <div>
            <div className="welcome-section" style={{marginBottom: "24px"}}>
              <div>
                <h1>Learning Analytics</h1>
                <p>Visualize streaks, course completion rates, and test trends using custom SVG charts.</p>
              </div>
            </div>

            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px"}}>
              {/* Streaks & Completion Rate Card */}
              <div style={{background: "white", padding: "24px", borderRadius: "18px", border: "1px solid #e2e8f0", textAlign: "center"}}>
                <h3>Course Enrolled Completion</h3>
                
                {/* SVG Progress Circle */}
                <div style={{position: "relative", width: "160px", height: "160px", margin: "24px auto"}}>
                  <svg width="100%" height="100%" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                    <circle 
                      cx="20" cy="20" r="15.915" fill="none" stroke="#5b6ef5" strokeWidth="4" 
                      strokeDasharray={`${progressData.courseStats.completionRate} ${100 - progressData.courseStats.completionRate}`} 
                      strokeDashoffset="25"
                    />
                  </svg>
                  <div style={{position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "28px", fontWeight: "700", color: "#1e293b"}}>
                    {progressData.courseStats.completionRate}%
                  </div>
                </div>

                <div style={{display: "flex", justifyContent: "space-around", marginTop: "16px"}}>
                  <div>
                    <h4 style={{margin: 0}}>{progressData.courseStats.enrolled}</h4>
                    <span style={{fontSize: "12px", color: "#64748b"}}>Enrolled</span>
                  </div>
                  <div>
                    <h4 style={{margin: 0}}>{progressData.courseStats.completed}</h4>
                    <span style={{fontSize: "12px", color: "#64748b"}}>Completed</span>
                  </div>
                </div>
              </div>

              {/* Task Planner completions */}
              <div style={{background: "white", padding: "24px", borderRadius: "18px", border: "1px solid #e2e8f0", textAlign: "center"}}>
                <h3>Study Planner Completion Rate</h3>
                
                <div style={{position: "relative", width: "160px", height: "160px", margin: "24px auto"}}>
                  <svg width="100%" height="100%" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                    <circle 
                      cx="20" cy="20" r="15.915" fill="none" stroke="#10b981" strokeWidth="4" 
                      strokeDasharray={`${progressData.plannerStats.completionRate} ${100 - progressData.plannerStats.completionRate}`} 
                      strokeDashoffset="25"
                    />
                  </svg>
                  <div style={{position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "28px", fontWeight: "700", color: "#1e293b"}}>
                    {progressData.plannerStats.completionRate}%
                  </div>
                </div>

                <div style={{display: "flex", justifyContent: "space-around", marginTop: "16px"}}>
                  <div>
                    <h4 style={{margin: 0}}>{progressData.plannerStats.total}</h4>
                    <span style={{fontSize: "12px", color: "#64748b"}}>Total Tasks</span>
                  </div>
                  <div>
                    <h4 style={{margin: 0}}>{progressData.plannerStats.completed}</h4>
                    <span style={{fontSize: "12px", color: "#64748b"}}>Completed</span>
                  </div>
                </div>
              </div>

              {/* Quiz trend Line chart */}
              <div style={{background: "white", padding: "24px", borderRadius: "18px", border: "1px solid #e2e8f0", gridColumn: "span 2"}}>
                <h3>Quiz Performance Trend</h3>
                {progressData.quizTrend.length === 0 ? (
                  <p style={{color: "#94a3b8", textAlign: "center", margin: "40px 0"}}>Complete quizzes to log performance trends.</p>
                ) : (
                  <div style={{marginTop: "20px"}}>
                    {/* SVG Line Chart */}
                    <svg width="100%" height="200" viewBox="0 0 500 200" style={{background: "#f8fafc", borderRadius: "12px", padding: "12px"}}>
                      <line x1="40" y1="20" x2="40" y2="160" stroke="#cbd5e1" />
                      <line x1="40" y1="160" x2="480" y2="160" stroke="#cbd5e1" />
                      
                      {/* Gridlines */}
                      <line x1="40" y1="90" x2="480" y2="90" stroke="#f1f5f9" strokeDasharray="4" />
                      <line x1="40" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeDasharray="4" />
                      
                      {/* Labels */}
                      <text x="10" y="25" fill="#64748b" fontSize="10">100%</text>
                      <text x="10" y="95" fill="#64748b" fontSize="10">50%</text>
                      <text x="15" y="165" fill="#64748b" fontSize="10">0%</text>

                      {/* Line points */}
                      {(() => {
                        const step = Math.floor(400 / Math.max(1, progressData.quizTrend.length - 1));
                        const coords = progressData.quizTrend.map((q, idx) => {
                          const x = 40 + (idx * step);
                          const y = 160 - (q.score * 1.4); // scale score to chart height
                          return { x, y, score: q.score };
                        });
                        
                        const linePath = coords.map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(" ");

                        return (
                          <g>
                            <path d={linePath} fill="none" stroke="#5b6ef5" strokeWidth="3" />
                            {coords.map((c, idx) => (
                              <g key={idx}>
                                <circle cx={c.x} cy={c.y} r="5" fill="#5b6ef5" />
                                <text x={c.x - 10} y={c.y - 10} fill="#1e293b" fontSize="9" fontWeight="600">{c.score}%</text>
                              </g>
                            ))}
                          </g>
                        );
                      })()}
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Add/Edit Custom Task */}
        {showManualModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h2>{editingTaskId ? "Edit Task" : "Add Task"}</h2>
              
              <input 
                placeholder="Task Title (e.g. Code database routes)" 
                value={manualForm.title}
                onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
              />
              <input 
                placeholder="Course reference..." 
                value={manualForm.course}
                onChange={(e) => setManualForm({ ...manualForm, course: e.target.value })}
              />
              <select 
                value={manualForm.priority}
                onChange={(e) => setManualForm({ ...manualForm, priority: e.target.value })}
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <input 
                type="date"
                value={manualForm.date}
                onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
              />
              <div style={{display: "flex", gap: "10px"}}>
                <input 
                  type="time"
                  value={manualForm.startTime}
                  onChange={(e) => setManualForm({ ...manualForm, startTime: e.target.value })}
                />
                <input 
                  type="time"
                  value={manualForm.endTime}
                  onChange={(e) => setManualForm({ ...manualForm, endTime: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button className="tutor-btn" style={{background: "#10b981"}} onClick={handleAddManualTask}>
                  Save Task
                </button>
                <button className="tutor-btn" style={{background: "#64748b"}} onClick={() => { setShowManualModal(false); setEditingTaskId(null); }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default StudentDashboard;