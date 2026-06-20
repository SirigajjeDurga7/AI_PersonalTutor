// src/pages/StudyPlanner.jsx

import "./StudyPlanner.css";
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function StudyPlanner() {
  const navigate = useNavigate();

  const currentUser = JSON.parse(
    localStorage.getItem("currentUser")
  );

  const [course, setCourse] = useState("");
const [goal, setGoal] = useState("");
const [deadline, setDeadline] = useState("");
const [dailyHours, setDailyHours] = useState(2);

const [plan, setPlan] = useState([]);
const [loading, setLoading] = useState(false);

  const today = new Date();

  const formattedDate = today.toISOString().split("T")[0];

  const formattedDay = today.toLocaleDateString(
    "en-US",
    {
      weekday: "long",
    }
  );

  useEffect(() => {
  fetchPlan();
}, []);

const fetchPlan = async () => {
  try {
    const response = await axios.get(
      "http://localhost:8000/study-plan",
      {
        params: {
          email: currentUser.email,
        },
      }
    );

    setPlan(response.data.generatedTasks);

    setCourse(response.data.course);
    setGoal(response.data.goal);
    setDeadline(response.data.deadline);
    setDailyHours(response.data.dailyHours);

  } catch (error) {
    console.log("No plan yet");
  }
};
const generatePlan = async () => {

  setLoading(true);

  try {

    const response = await axios.post(
      "http://localhost:8000/generate-study-plan",
      {
        email: currentUser.email,
        course,
        goal,
        deadline,
        dailyHours,
      }
    );

    setPlan(response.data);

    alert("Study plan generated!");

  } catch (error) {

    alert(
      error.response?.data?.message ||
      "Generation failed"
    );

  }

  setLoading(false);
};
const markDone = async (index) => {

  try {

    await axios.put(
      "http://localhost:8000/study-plan/complete",
      {
        email: currentUser.email,
        course,
        index,
      }
    );

    fetchPlan();

  } catch (error) {

    console.error(error);

  }
};
const deletePlan = async () => {

  if (!window.confirm(
    "Delete current plan?"
  )) {
    return;
  }

  await axios.delete(
    "http://localhost:8000/study-plan",
    {
      params: {
        email: currentUser.email,
        course,
      },
    }
  );

  setPlan([]);
};

  const handleChange = (e) => {
    setTaskForm({
      ...taskForm,
      [e.target.name]: e.target.value,
    });
  };

  const openAddModal = () => {
    setEditingTaskId(null);

    setTaskForm({
      title: "",
      course: "",
      priority: "Medium",
      date: formattedDate,
      startTime: "",
      endTime: "",
    });

    setShowModal(true);
  };

  const openEditModal = (task) => {
    setEditingTaskId(task._id);

    setTaskForm({
      title: task.title,
      course: task.course,
      priority: task.priority,
      date: task.date,
      startTime: task.startTime,
      endTime: task.endTime,
    });

    setShowModal(true);
  };

  const handleSave = async () => {
    try {

      if (editingTaskId) {

        await axios.put(
          `http://localhost:8000/tasks/${editingTaskId}`,
          {
            ...taskForm,
            day: formattedDay,
          }
        );

        alert("Task updated successfully");

      } else {

        await axios.post(
          "http://localhost:8000/tasks",
          {
            studentEmail: currentUser.email,
            ...taskForm,
            day: formattedDay,
          }
        );

        alert("Task added successfully");
      }

      setShowModal(false);

      fetchTasks();

    } catch (error) {
      console.error(error);

      alert("Failed to save task");
    }
  };

  const handleComplete = async (taskId) => {
    try {

      await axios.put(
        `http://localhost:8000/tasks/${taskId}/complete`
      );

      fetchTasks();

    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (taskId) => {
    const confirmDelete = window.confirm(
      "Delete this task?"
    );

    if (!confirmDelete) return;

    try {

      await axios.delete(
        `http://localhost:8000/tasks/${taskId}`
      );

      fetchTasks();

    } catch (error) {
      console.error(error);
    }
  };

  return (
  <div className="planner-container">

    <h1>✨ AI Study Planner</h1>

    <div className="generator-card">

      <input
        placeholder="Course Name"
        value={course}
        onChange={(e) =>
          setCourse(e.target.value)
        }
      />

      <textarea
        placeholder="Goal..."
        value={goal}
        onChange={(e) =>
          setGoal(e.target.value)
        }
      />

      <input
        type="date"
        value={deadline}
        onChange={(e) =>
          setDeadline(e.target.value)
        }
      />

      <input
        type="number"
        min="1"
        max="12"
        value={dailyHours}
        onChange={(e) =>
          setDailyHours(e.target.value)
        }
      />

      <button
        onClick={generatePlan}
      >
        {loading
          ? "Generating..."
          : "🚀 Generate AI Plan"}
      </button>

    </div>

    {plan.length > 0 && (

      <div className="roadmap-card">

        <div className="roadmap-header">

          <h2>Your Roadmap</h2>

          <button
            onClick={deletePlan}
          >
            Delete Plan
          </button>

        </div>

        {plan.map((task, index) => (

          <div
            className="roadmap-item"
            key={index}
          >

            <div>

              <h3>
                Day {index + 1}
              </h3>

              <p>
                {task.topic}
              </p>

              <span>
                📅 {task.date}
              </span>

              <span>
                ⏰ {task.duration} hrs
              </span>

            </div>

            <button
              disabled={task.completed}
              onClick={() =>
                markDone(index)
              }
            >
              {task.completed
                ? "✅ Done"
                : "Mark Done"}
            </button>

          </div>

        ))}

      </div>

    )}

  </div>
);
}

export default StudyPlanner;