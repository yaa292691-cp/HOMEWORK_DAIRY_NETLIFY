import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import "./styles.css";

const emptyProfile = {
  role: "Student",
  full_name: "",
  father_name: "",
  email: "",
  password: "",
  age: "",
  gender: "",
  institution_type: "",
  institution_name: "",
  class_name: "",
  section: "",
  group_name: "",
  roll_number: "",
};

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [page, setPage] = useState("login");
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("homework-diary-theme") || "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("homework-diary-theme", theme);
    } catch {
      // Theme still works for this session.
    }
  }, [theme]);

  useEffect(() => {
    let active = true;

    async function initialize() {
      const { data, error } = await supabase.auth.getSession();

      if (!active) return;

      if (error) {
        setError(error.message);
      }

      setSession(data?.session || null);
      setAuthReady(true);
    }

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return;

      setSession(newSession);
      setAuthReady(true);

      if (!newSession) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady) return;

    if (!session?.user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let active = true;

    async function getProfile() {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!active) return;

      if (error) {
        setError("Could not load your profile: " + error.message);
        setProfile(null);
      } else if (!data) {
        setError(
          "Your account exists, but its profile was not found. Please contact the administrator."
        );
        setProfile(null);
      } else {
        setProfile(data);
      }

      setLoading(false);
    }

    getProfile();

    return () => {
      active = false;
    };
  }, [session?.user?.id, authReady]);

  async function logout() {
    setError("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      setError(error.message);
      return;
    }

    setSession(null);
    setProfile(null);
    setPage("login");
    setSuccess("");
  }

  function changeTheme() {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }

  return (
    <div className={`app-shell theme-${theme}`}>
      <header className="topbar">
        <a
          className="brand"
          href="#home"
          onClick={(event) => event.preventDefault()}
          aria-label="HOMEWORK DIARY home"
        >
          <span className="brand-mark">HD</span>
          <span className="brand-copy">
            <strong>HOMEWORK</strong>
            <span>DIARY</span>
          </span>
        </a>

        <div className="topbar-right">
          <span className="theme-label">
            {theme === "light" ? "Light mode" : "Dark mode"}
          </span>

          <button
            type="button"
            className="theme-toggle"
            onClick={changeTheme}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            <span aria-hidden="true">
              {theme === "light" ? "☾" : "☀"}
            </span>
          </button>
        </div>
      </header>

      <main className="page-content">
        {loading ? (
          <section className="panel loading-panel">
            <div className="loading-spinner" />
            <h2>Getting things ready</h2>
            <p>Loading your HOMEWORK DIARY...</p>
          </section>
        ) : session && profile ? (
          profile.role === "Teacher" ? (
            <TeacherDashboard profile={profile} onLogout={logout} />
          ) : (
            <StudentDashboard profile={profile} onLogout={logout} />
          )
        ) : session && !profile ? (
          <section className="panel message-panel">
            <div className="section-icon">!</div>
            <h2>Profile unavailable</h2>
            <p className="error-message">
              {error || "Your profile could not be loaded."}
            </p>
            <button className="button button-secondary" onClick={logout}>
              Log Out
            </button>
          </section>
        ) : page === "register" ? (
          <RegisterPage
            onBack={() => {
              setPage("login");
              setError("");
              setSuccess("");
            }}
            error={error}
            success={success}
            setError={setError}
            setSuccess={setSuccess}
          />
        ) : (
          <LoginPage
            onRegister={() => {
              setPage("register");
              setError("");
              setSuccess("");
            }}
            error={error}
            success={success}
            setError={setError}
            setSuccess={setSuccess}
          />
        )}
      </main>

      <footer className="site-footer">
        <span>HOMEWORK DIARY</span>
        <span>Learn • Organize • Achieve</span>
      </footer>
    </div>
  );
}

function LoginPage({
  onRegister,
  error,
  success,
  setError,
  setSuccess,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) setError(error.message);
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-layout">
      <div className="welcome-panel">
        <div className="welcome-badge">
          <span className="welcome-dot" />
          Your schoolwork, organized
        </div>

        <h1>
          Make every
          <br />
          school day <span>count.</span>
        </h1>

        <p>
          One simple place for teachers to share homework
          and students to stay on track.
        </p>

        <div className="welcome-features">
          <div className="welcome-feature">
            <span className="feature-icon">✓</span>
            <span>Keep homework organized</span>
          </div>
          <div className="welcome-feature">
            <span className="feature-icon">↗</span>
            <span>Stay on top of due dates</span>
          </div>
          <div className="welcome-feature">
            <span className="feature-icon">◎</span>
            <span>Track finished assignments</span>
          </div>
        </div>

        <div className="welcome-decoration decoration-one" />
        <div className="welcome-decoration decoration-two" />
      </div>

      <div className="auth-card">
        <div className="auth-card-heading">
          <span className="eyebrow">WELCOME BACK</span>
          <h2>Log in to your account</h2>
          <p>Enter your details to continue.</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleLogin} className="form-stack">
          <label className="field">
            <span>Email address</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </label>

          <button
            type="submit"
            className="button button-primary button-full"
            disabled={submitting}
          >
            {submitting ? "Logging in..." : "Log In"}
            {!submitting && <span aria-hidden="true">→</span>}
          </button>
        </form>

        <div className="auth-divider">
          <span>NEW TO HOMEWORK DIARY?</span>
        </div>

        <button
          type="button"
          className="button button-secondary button-full"
          onClick={onRegister}
        >
          Create New Account
        </button>
      </div>
    </section>
  );
}

function RegisterPage({
  onBack,
  error,
  success,
  setError,
  setSuccess,
}) {
  const [form, setForm] = useState({ ...emptyProfile });
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleRegister(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      // Create the Auth account and pass profile fields as user metadata.
      // The Supabase trigger creates the matching public.profiles row.
      const { data: authData, error: authError } =
        await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            data: {
              full_name: form.full_name.trim(),
              father_name:
                form.role === "Student" ? form.father_name.trim() : null,
              role: form.role,
              age: form.age ? Number(form.age) : null,
              gender: form.gender || null,
              institution_type: form.institution_type,
              institution_name: form.institution_name.trim(),
              class_name: form.class_name.trim(),
              section: form.section.trim(),
              group_name: form.group_name.trim() || null,
              roll_number:
                form.role === "Student"
                  ? form.roll_number.trim() || null
                  : null,
            },
          },
        });

      if (authError) throw authError;

      const user = authData?.user;
      if (!user) {
        throw new Error("Account could not be created. Please try again.");
      }

      // Upload the photo only when signup creates an active session.
      // With email confirmation enabled, the user can log in first and
      // upload a photo later; profile creation does not depend on the photo.
      if (photo && authData.session) {
        const extension = photo.name.split(".").pop()?.toLowerCase() || "jpg";
        const filePath = `${user.id}/profile-${Date.now()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("profile-photos")
          .upload(filePath, photo, {
            upsert: true,
            contentType: photo.type || "image/jpeg",
          });

        if (uploadError) {
          throw new Error(
            "Your account was created, but the photo upload failed: " +
              uploadError.message
          );
        }

        const { data: photoData } = supabase.storage
          .from("profile-photos")
          .getPublicUrl(filePath);

        const { error: photoUpdateError } = await supabase
          .from("profiles")
          .update({ photo_url: photoData.publicUrl })
          .eq("id", user.id);

        if (photoUpdateError) {
          throw new Error(
            "Your account was created, but saving the photo link failed: " +
              photoUpdateError.message
          );
        }
      }

      if (authData.session) {
        setSuccess(
          "Your account was created. Your profile is created automatically. You can now log in if the dashboard does not open."
        );
      } else {
        setSuccess(
          "Your account was created. Check your email to confirm your account if requested, then log in. The profile is created automatically by Supabase."
        );
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="register-layout">
      <div className="register-heading">
        <span className="eyebrow">GET STARTED</span>
        <h1>Create your account</h1>
        <p>Join HOMEWORK DIARY and keep schoolwork organized.</p>
      </div>

      <div className="auth-card register-card">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleRegister} className="form-stack">
          <div className="form-grid">
            <label className="field">
              <span>Account type</span>
              <select
                name="role"
                value={form.role}
                onChange={updateField}
                required
              >
                <option value="Student">Student</option>
                <option value="Teacher">Teacher</option>
              </select>
            </label>

            <label className="field">
              <span>Full name</span>
              <input
                name="full_name"
                value={form.full_name}
                onChange={updateField}
                placeholder="Enter full name"
                required
              />
            </label>

            {form.role === "Student" && (
              <label className="field">
                <span>Father name</span>
                <input
                  name="father_name"
                  value={form.father_name}
                  onChange={updateField}
                  placeholder="Enter father name"
                  required
                />
              </label>
            )}

            <label className="field">
              <span>Email address</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={updateField}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={updateField}
                placeholder="At least 6 characters"
                minLength={6}
                autoComplete="new-password"
                required
              />
            </label>

            <label className="field">
              <span>Age</span>
              <input
                type="number"
                name="age"
                value={form.age}
                onChange={updateField}
                min="1"
                max="120"
                placeholder="Your age"
              />
            </label>

            <label className="field">
              <span>Gender</span>
              <select
                name="gender"
                value={form.gender}
                onChange={updateField}
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label className="field">
              <span>Institution type</span>
              <select
                name="institution_type"
                value={form.institution_type}
                onChange={updateField}
                required
              >
                <option value="">Select institution type</option>
                <option value="Primary School">Primary School</option>
                <option value="Secondary School">Secondary School</option>
                <option value="High School">High School</option>
                <option value="College">College</option>
              </select>
            </label>

            <label className="field field-wide">
              <span>Institution name</span>
              <input
                name="institution_name"
                value={form.institution_name}
                onChange={updateField}
                placeholder="Enter school or college name"
                required
              />
            </label>

            <label className="field">
              <span>Class</span>
              <input
                name="class_name"
                value={form.class_name}
                onChange={updateField}
                placeholder="Enter class"
                required
              />
            </label>

            <label className="field">
              <span>Section</span>
              <input
                name="section"
                value={form.section}
                onChange={updateField}
                placeholder="Enter section"
                required
              />
            </label>

            {(form.institution_type === "High School" ||
              form.institution_type === "College") && (
              <label className="field">
                <span>Group</span>
                <input
                  name="group_name"
                  value={form.group_name}
                  onChange={updateField}
                  placeholder="For example, CS"
                />
              </label>
            )}

            {form.role === "Student" && (
              <label className="field">
                <span>Roll number</span>
                <input
                  name="roll_number"
                  value={form.roll_number}
                  onChange={updateField}
                  placeholder="Enter roll number"
                  required
                />
              </label>
            )}

            <label className="field field-wide">
              <span>Profile photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setPhoto(event.target.files?.[0] || null)
                }
              />
              <small>Choose a clear image for your profile.</small>
            </label>
          </div>

          <button
            type="submit"
            className="button button-primary button-full"
            disabled={submitting}
          >
            {submitting ? "Creating account..." : "Create Account"}
            {!submitting && <span aria-hidden="true">→</span>}
          </button>
        </form>

        <button
          type="button"
          className="button button-ghost button-full"
          onClick={onBack}
        >
          ← Back to Login
        </button>
      </div>
    </section>
  );
}

function ProfileCard({ profile, onLogout }) {
  const isStudent = profile.role === "Student";

  return (
    <section className="profile-banner">
      <div className="profile-main">
        {profile.photo_url ? (
          <img
            className="profile-photo"
            src={profile.photo_url}
            alt={`${profile.full_name}'s profile`}
          />
        ) : (
          <div className="profile-photo profile-placeholder">
            {profile.full_name?.charAt(0)?.toUpperCase() || "?"}
          </div>
        )}

        <div className="profile-identity">
          <span className="eyebrow">
            {isStudent ? "STUDENT PROFILE" : "TEACHER PROFILE"}
          </span>
          <h2>{profile.full_name}</h2>
          <p>{profile.institution_name}</p>
        </div>
      </div>

      <div className="profile-details">
        {isStudent && (
          <div className="profile-detail">
            <span>Father name</span>
            <strong>{profile.father_name || "—"}</strong>
          </div>
        )}

        <div className="profile-detail">
          <span>Class</span>
          <strong>{profile.class_name || "—"}</strong>
        </div>

        <div className="profile-detail">
          <span>Section</span>
          <strong>{profile.section || "—"}</strong>
        </div>

        {isStudent && (
          <div className="profile-detail">
            <span>Roll number</span>
            <strong>{profile.roll_number || "—"}</strong>
          </div>
        )}
      </div>

      <button
        className="button button-secondary logout-button"
        onClick={onLogout}
      >
        Log Out
      </button>
    </section>
  );
}

function TeacherDashboard({ profile, onLogout }) {
  const [students, setStudents] = useState([]);
  const [homeworkList, setHomeworkList] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [subject, setSubject] = useState("");
  const [homeworkText, setHomeworkText] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [targetType, setTargetType] = useState("class");
  const [targetStudentId, setTargetStudentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadTeacherData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  async function loadTeacherData() {
    setLoading(true);
    setError("");

    const { data: studentData, error: studentError } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "Student")
      .eq("institution_name", profile.institution_name)
      .eq("class_name", profile.class_name)
      .eq("section", profile.section);

    if (studentError) {
      setError("Could not load students: " + studentError.message);
      setLoading(false);
      return;
    }

    const matchingStudents = (studentData || []).filter((student) => {
      if (
        profile.institution_type === "High School" ||
        profile.institution_type === "College"
      ) {
        return (
          (student.group_name || "").trim().toLowerCase() ===
          (profile.group_name || "").trim().toLowerCase()
        );
      }

      return true;
    });

    setStudents(matchingStudents);

    const { data: homeworkData, error: homeworkError } = await supabase
      .from("homework")
      .select("*")
      .eq("teacher_id", profile.id)
      .order("created_at", { ascending: false });

    if (homeworkError) {
      setError("Could not load homework: " + homeworkError.message);
      setLoading(false);
      return;
    }

    setHomeworkList(homeworkData || []);

    const homeworkIds = (homeworkData || []).map((item) => item.id);

    if (homeworkIds.length) {
      const { data: completionData, error: completionError } =
        await supabase
          .from("homework_completions")
          .select("*")
          .in("homework_id", homeworkIds);

      if (completionError) {
        setError(
          "Could not load finished homework: " + completionError.message
        );
      } else {
        setCompletions(completionData || []);
      }
    } else {
      setCompletions([]);
    }

    setLoading(false);
  }

  async function sendHomework(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (targetType === "student" && !targetStudentId) {
      setError("Please select a student.");
      return;
    }

    if (!subject.trim() || !homeworkText.trim() || !dueDate) {
      setError("Please enter the subject, homework details, and due date.");
      return;
    }

    setSending(true);

    // These field names match your existing Supabase homework table.
    const newHomework = {
      teacher_id: profile.id,
      recipient_institution_name: profile.institution_name,
      recipient_class_name: profile.class_name,
      recipient_section: profile.section,
      recipient_group_name: profile.group_name || null,
      subject: subject.trim(),
      homework_text: homeworkText.trim(),
      due_date: dueDate,
      recipient_type: targetType,
      recipient_student_id:
        targetType === "student" ? targetStudentId : null,
    };

    const { error: insertError } = await supabase
      .from("homework")
      .insert(newHomework);

    if (insertError) {
      setError("Could not send homework: " + insertError.message);
    } else {
      setSuccess("Homework sent successfully!");
      setSubject("");
      setHomeworkText("");
      setDueDate("");
      setTargetType("class");
      setTargetStudentId("");
      await loadTeacherData();
    }

    setSending(false);
  }

  function getStudentName(studentId) {
    return (
      students.find((student) => student.id === studentId)?.full_name ||
      "Student"
    );
  }

  const finishedCount = completions.length;

  return (
    <div className="dashboard">
      <ProfileCard profile={profile} onLogout={onLogout} />

      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">YOUR WORKSPACE</span>
          <h1>Teacher Dashboard</h1>
          <p>Share assignments and follow student progress.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon stat-blue">▤</span>
          <div>
            <span className="stat-label">Homework sent</span>
            <strong>{homeworkList.length}</strong>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon stat-green">✓</span>
          <div>
            <span className="stat-label">Finished entries</span>
            <strong>{finishedCount}</strong>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon stat-violet">♙</span>
          <div>
            <span className="stat-label">Matching students</span>
            <strong>{students.length}</strong>
          </div>
        </div>
      </div>

      <section className="panel">
        <div className="section-heading">
          <div className="section-icon">＋</div>
          <div>
            <h2>Send Homework</h2>
            <p>Create an assignment for your class or one student.</p>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={sendHomework} className="form-stack">
          <div className="form-grid">
            <label className="field">
              <span>Subject</span>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="e.g. Mathematics"
                required
              />
            </label>

            <label className="field">
              <span>Due date</span>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                min={new Date().toLocaleDateString("en-CA")}
                required
              />
            </label>

            <label className="field field-wide">
              <span>Homework instructions</span>
              <textarea
                value={homeworkText}
                onChange={(event) => setHomeworkText(event.target.value)}
                placeholder="Write the homework details..."
                rows={4}
                required
              />
            </label>

            <label className="field">
              <span>Send to</span>
              <select
                value={targetType}
                onChange={(event) => {
                  setTargetType(event.target.value);
                  setTargetStudentId("");
                }}
              >
                <option value="class">Entire Matching Class</option>
                <option value="student">Specific Student</option>
              </select>
            </label>

            {targetType === "student" && (
              <label className="field">
                <span>Select student</span>
                <select
                  value={targetStudentId}
                  onChange={(event) =>
                    setTargetStudentId(event.target.value)
                  }
                  required
                >
                  <option value="">Choose a student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name}
                      {student.roll_number
                        ? ` — Roll ${student.roll_number}`
                        : ""}
                    </option>
                  ))}
                </select>

                {students.length === 0 && (
                  <small>No matching students were found.</small>
                )}
              </label>
            )}
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="button button-primary"
              disabled={sending}
            >
              {sending ? "Sending..." : "Send Homework"}
              {!sending && <span aria-hidden="true">→</span>}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div className="section-icon">▤</div>
          <div>
            <h2>Sent Homework</h2>
            <p>Assignments you have shared with students.</p>
          </div>
        </div>

        {loading ? (
          <p className="empty-state">Loading homework...</p>
        ) : homeworkList.length === 0 ? (
          <EmptyState
            icon="▤"
            title="No homework yet"
            message="Your assignments will appear here after you send them."
          />
        ) : (
          <div className="homework-list">
            {homeworkList.map((item) => (
              <article className="homework-card" key={item.id}>
                <div className="homework-card-top">
                  <span className="subject-tag">{item.subject}</span>
                  <span className="status-pill status-blue">
                    {item.recipient_type === "student"
                      ? "Specific student"
                      : "Whole class"}
                  </span>
                </div>

                <h3>{item.subject}</h3>
                <p className="homework-description">
                  {item.homework_text}
                </p>

                <div className="homework-meta">
                  <span>
                    <strong>Due:</strong> {item.due_date}
                  </span>
                  <span>
                    <strong>Sent to:</strong>{" "}
                    {item.recipient_type === "student"
                      ? getStudentName(item.recipient_student_id)
                      : "Entire Matching Class"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="section-heading">
          <div className="section-icon section-icon-green">✓</div>
          <div>
            <h2>Finished Homework</h2>
            <p>See which students have completed their assignments.</p>
          </div>
        </div>

        {completions.length === 0 ? (
          <EmptyState
            icon="✓"
            title="Nothing finished yet"
            message="Completed homework will appear here."
          />
        ) : (
          <div className="homework-list">
            {completions.map((completion) => {
              const item = homeworkList.find(
                (homework) => homework.id === completion.homework_id
              );

              const student = students.find(
                (entry) => entry.id === completion.student_id
              );

              if (!item) return null;

              return (
                <article className="homework-card" key={completion.id}>
                  <div className="homework-card-top">
                    <span className="subject-tag">{item.subject}</span>
                    <span className="status-pill status-green">
                      ✓ Finished
                    </span>
                  </div>

                  <h3>{item.subject}</h3>
                  <p className="homework-description">
                    {item.homework_text}
                  </p>

                  <div className="completion-student">
                    {student?.photo_url ? (
                      <img src={student.photo_url} alt="" />
                    ) : (
                      <span className="mini-avatar">
                        {student?.full_name?.charAt(0) || "S"}
                      </span>
                    )}

                    <div>
                      <strong>{student?.full_name || "Student"}</strong>
                      <small>
                        {student?.roll_number
                          ? `Roll number: ${student.roll_number}`
                          : "Student"}
                      </small>
                    </div>
                  </div>

                  {completion.completed_at && (
                    <p className="completion-date">
                      Finished{" "}
                      {new Date(completion.completed_at).toLocaleString()}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StudentDashboard({ profile, onLogout }) {
  const [homeworkList, setHomeworkList] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workingId, setWorkingId] = useState(null);

  useEffect(() => {
    loadStudentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  async function loadStudentData() {
    setLoading(true);
    setError("");

    const { data: allHomework, error: homeworkError } = await supabase
      .from("homework")
      .select("*")
      .order("created_at", { ascending: false });

    if (homeworkError) {
      setError("Could not load homework: " + homeworkError.message);
      setLoading(false);
      return;
    }

    // Use the actual recipient_* column names from Supabase.
    const matchingHomework = (allHomework || []).filter((item) => {
      if (
        item.recipient_institution_name !== profile.institution_name ||
        item.recipient_class_name !== profile.class_name ||
        item.recipient_section !== profile.section
      ) {
        return false;
      }

      if (
        profile.institution_type === "High School" ||
        profile.institution_type === "College"
      ) {
        if (
          (item.recipient_group_name || "").trim().toLowerCase() !==
          (profile.group_name || "").trim().toLowerCase()
        ) {
          return false;
        }
      }

      if (
        item.recipient_type === "student" &&
        item.recipient_student_id !== profile.id
      ) {
        return false;
      }

      return true;
    });

    setHomeworkList(matchingHomework);

    const ids = matchingHomework.map((item) => item.id);

    if (ids.length) {
      const { data: completionData, error: completionError } =
        await supabase
          .from("homework_completions")
          .select("*")
          .eq("student_id", profile.id)
          .in("homework_id", ids);

      if (completionError) {
        setError(
          "Could not load homework history: " + completionError.message
        );
      } else {
        setCompletions(completionData || []);
      }
    } else {
      setCompletions([]);
    }

    setLoading(false);
  }

  function isFinished(homeworkId) {
    return completions.some((item) => item.homework_id === homeworkId);
  }

  async function finishHomework(item) {
    if (isFinished(item.id)) return;

    setError("");
    setWorkingId(item.id);

    const { data, error: completionError } = await supabase
      .from("homework_completions")
      .insert({
        homework_id: item.id,
        student_id: profile.id,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (completionError) {
      setError(
        "Could not mark homework as finished: " + completionError.message
      );
    } else {
      setCompletions((previous) => [...previous, data]);
    }

    setWorkingId(null);
  }

  const today = new Date().toLocaleDateString("en-CA");

  const activeHomework = homeworkList.filter(
    (item) => !isFinished(item.id) && item.due_date >= today
  );

  const historyHomework = homeworkList.filter(
    (item) => isFinished(item.id) || item.due_date < today
  );

  return (
    <div className="dashboard">
      <ProfileCard profile={profile} onLogout={onLogout} />

      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">YOUR LEARNING SPACE</span>
          <h1>Student Dashboard</h1>
          <p>Keep up with your assignments, one task at a time.</p>
        </div>
      </div>

      <div className="stats-grid stats-grid-student">
        <div className="stat-card">
          <span className="stat-icon stat-blue">▤</span>
          <div>
            <span className="stat-label">Active homework</span>
            <strong>{activeHomework.length}</strong>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon stat-green">✓</span>
          <div>
            <span className="stat-label">Finished</span>
            <strong>{completions.length}</strong>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon stat-violet">◷</span>
          <div>
            <span className="stat-label">History items</span>
            <strong>{historyHomework.length}</strong>
          </div>
        </div>
      </div>

      <section className="panel">
        <div className="section-heading">
          <div className="section-icon">▤</div>
          <div>
            <h2>My Homework</h2>
            <p>Complete these assignments before their due dates.</p>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <p className="empty-state">Loading homework...</p>
        ) : activeHomework.length === 0 ? (
          <EmptyState
            icon="✓"
            title="You're all caught up"
            message="There is no active homework for you right now."
          />
        ) : (
          <div className="homework-list">
            {activeHomework.map((item) => (
              <article className="homework-card" key={item.id}>
                <div className="homework-card-top">
                  <span className="subject-tag">{item.subject}</span>
                  <span className="status-pill status-blue">To do</span>
                </div>

                <h3>{item.subject}</h3>
                <p className="homework-description">
                  {item.homework_text}
                </p>

                <div className="homework-meta">
                  <span>
                    <strong>Due:</strong> {item.due_date}
                  </span>
                </div>

                <div className="homework-card-actions">
                  <button
                    className="button button-primary"
                    onClick={() => finishHomework(item)}
                    disabled={workingId === item.id}
                  >
                    {workingId === item.id ? "Saving..." : "✓ Finished"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="section-heading">
          <div className="section-icon section-icon-green">◷</div>
          <div>
            <h2>History Homework</h2>
            <p>Review finished and past-due assignments.</p>
          </div>
        </div>

        {loading ? (
          <p className="empty-state">Loading history...</p>
        ) : historyHomework.length === 0 ? (
          <EmptyState
            icon="◷"
            title="Your history is empty"
            message="Finished or past-due assignments will appear here."
          />
        ) : (
          <div className="homework-list">
            {historyHomework.map((item) => (
              <article className="homework-card history-card" key={item.id}>
                <div className="homework-card-top">
                  <span className="subject-tag">{item.subject}</span>
                  <span
                    className={`status-pill ${
                      isFinished(item.id) ? "status-green" : "status-muted"
                    }`}
                  >
                    {isFinished(item.id) ? "✓ Finished" : "Past due"}
                  </span>
                </div>

                <h3>{item.subject}</h3>
                <p className="homework-description">
                  {item.homework_text}
                </p>

                <div className="homework-meta">
                  <span>
                    <strong>Due:</strong> {item.due_date}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyState({ icon, title, message }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}

export default App;
