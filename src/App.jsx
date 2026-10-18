import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import "./styles.css";

const FIXED_INSTITUTION_NAME = "PUBLIC SCHOOL AND COLLEGE SKARDU";
const GROUP_OPTIONS = ["COMPUTER SCIENCE", "PREMEDICAL", "ENGINEERING"];

const emptyProfile = {
  role: "Student",
  full_name: "",
  father_name: "",
  email: "",
  password: "",
  age: "",
  gender: "",
  institution_type: "College",
  institution_name: FIXED_INSTITUTION_NAME,
  class_name: "",
  section: "",
  group_name: "",
  roll_number: "",
  photo_url: "",
};

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

function sameText(a, b) {
  return normalizeText(a) === normalizeText(b);
}

function todayString() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "No due date";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString();
}

function getErrorMessage(error) {
  return error?.message || "Something went wrong. Please try again.";
}

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [page, setPage] = useState("login");
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("homework-diary-theme") || "light";
    } catch {
      return "light";
    }
  });

  const [authForm, setAuthForm] = useState({
    email: "",
    password: "",
  });

  const [registerForm, setRegisterForm] = useState(emptyProfile);
  const [profilePhoto, setProfilePhoto] = useState(null);

  const [homework, setHomework] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [teacherClass, setTeacherClass] = useState("");
  const [teacherSection, setTeacherSection] = useState("");
  const [teacherGroup, setTeacherGroup] = useState("");
  const [subject, setSubject] = useState("");
  const [homeworkText, setHomeworkText] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [targetType, setTargetType] = useState("class");
  const [targetStudentId, setTargetStudentId] = useState("");
  const [activeTab, setActiveTab] = useState("current");

  useEffect(() => {
    try {
      localStorage.setItem("homework-diary-theme", theme);
    } catch {
      // The theme still works during this session.
    }
  }, [theme]);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const { data, error: sessionError } =
          await supabase.auth.getSession();

        if (!active) return;

        if (sessionError) setError(sessionError.message);
        setSession(data?.session || null);
      } catch (err) {
        if (active) setError(getErrorMessage(err));
      } finally {
        if (active) setAuthReady(true);
      }
    }

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return;
      setSession(newSession);
      setAuthReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady) return;

    let active = true;

    async function loadProfile() {
      if (!session?.user?.id) {
        setProfile(null);
        setLoading(false);
        setPage("login");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!active) return;

        if (profileError) throw profileError;

        if (!data) {
          setProfile(null);
          setPage("profile-missing");
          setError(
            "Your account exists, but its profile was not found. Please contact the administrator."
          );
          return;
        }

        setProfile(data);
        setTeacherClass(data.class_name || "");
        setTeacherSection(data.section || "");
        setTeacherGroup(data.group_name || "");
        setPage(data.role === "Teacher" ? "teacher" : "student");
      } catch (err) {
        if (!active) return;
        setError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [authReady, session]);

  useEffect(() => {
    if (!profile || !session?.user?.id) return;

    loadDashboardData();
    // Reload when the signed-in account or its teaching selection changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    profile?.id,
    profile?.role,
    teacherClass,
    teacherSection,
    teacherGroup,
  ]);

  async function loadDashboardData() {
    setError("");

    try {
      if (profile?.role === "Teacher") {
        const { data: homeworkRows, error: homeworkError } = await supabase
          .from("homework")
          .select("*")
          .eq("teacher_id", session.user.id)
          .order("created_at", { ascending: false });

        if (homeworkError) throw homeworkError;

        setHomework(homeworkRows || []);

        const homeworkIds = (homeworkRows || []).map((item) => item.id);

        if (homeworkIds.length) {
          const { data: completionRows, error: completionError } =
            await supabase
              .from("homework_completions")
              .select("*")
              .in("homework_id", homeworkIds);

          if (completionError) throw completionError;
          setCompletions(completionRows || []);
        } else {
          setCompletions([]);
        }

        const { data: studentRows, error: studentError } = await supabase
          .from("profiles")
          .select(
            "id, full_name, father_name, institution_name, class_name, section, group_name, roll_number, photo_url, role"
          )
          .eq("role", "Student");

        if (studentError) throw studentError;

        setStudents(
          (studentRows || []).filter(
            (student) =>
              sameText(student.institution_name, FIXED_INSTITUTION_NAME)
          )
        );
      } else {
        const { data: homeworkRows, error: homeworkError } = await supabase
          .from("homework")
          .select("*")
          .order("created_at", { ascending: false });

        if (homeworkError) throw homeworkError;

        const matchingHomework = (homeworkRows || []).filter((item) => {
          const institutionMatches = sameText(
            item.institution_name,
            profile.institution_name
          );
          const classMatches = sameText(item.class_name, profile.class_name);
          const sectionMatches = sameText(item.section, profile.section);

          const itemGroup = normalizeText(item.group_name);
          const studentGroup = normalizeText(profile.group_name);

          const groupMatches = !itemGroup || itemGroup === studentGroup;
          const isClassAssignment =
            !item.target_type ||
            item.target_type === "class" ||
            item.target_type === "entire_class";

          const isStudentAssignment =
            item.target_type === "student" ||
            item.target_type === "specific_student";

          const targetMatches =
            isClassAssignment ||
            (isStudentAssignment &&
              item.target_student_id === session.user.id);

          return (
            institutionMatches &&
            classMatches &&
            sectionMatches &&
            groupMatches &&
            targetMatches
          );
        });

        setHomework(matchingHomework);

        const homeworkIds = matchingHomework.map((item) => item.id);

        if (homeworkIds.length) {
          const { data: completionRows, error: completionError } =
            await supabase
              .from("homework_completions")
              .select("*")
              .eq("student_id", session.user.id)
              .in("homework_id", homeworkIds);

          if (completionError) throw completionError;
          setCompletions(completionRows || []);
        } else {
          setCompletions([]);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function updateRegisterField(event) {
    const { name, value } = event.target;
    setRegisterForm((current) => ({
      ...current,
      [name]:
        name === "institution_name"
          ? FIXED_INSTITUTION_NAME
          : value,
    }));
  }

  async function uploadProfilePhoto(userId) {
    if (!profilePhoto) return null;

    const extension = profilePhoto.name.split(".").pop() || "jpg";
    const filePath = `${userId}/profile-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-photos")
      .upload(filePath, profilePhoto, {
        upsert: true,
        contentType: profilePhoto.type || "image/jpeg",
      });

    if (uploadError) {
      throw new Error(
        `Profile photo upload failed: ${uploadError.message}. You can try registering without a photo.`
      );
    }

    const { data } = supabase.storage
      .from("profile-photos")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function handleRegister(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!registerForm.full_name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!registerForm.email.trim() || !registerForm.password) {
      setError("Please enter your email and password.");
      return;
    }

    if (registerForm.password.length < 6) {
      setError("Your password must contain at least 6 characters.");
      return;
    }

    if (
      !registerForm.class_name.trim() ||
      !registerForm.section.trim()
    ) {
      setError("Please enter your class and section.");
      return;
    }

    if (
      registerForm.role === "Student" &&
      !registerForm.roll_number.trim()
    ) {
      setError("Please enter your roll number.");
      return;
    }

    if (
      registerForm.institution_type === "College" &&
      !registerForm.group_name
    ) {
      setError("Please select your group.");
      return;
    }

    setBusy(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: registerForm.email.trim(),
        password: registerForm.password,
      });

      if (signUpError) throw signUpError;

      const user = data?.user;
      if (!user) {
        throw new Error("Registration did not return a user account.");
      }

      let photoUrl = null;

      if (profilePhoto) {
        photoUrl = await uploadProfilePhoto(user.id);
      }

      const profileData = {
        id: user.id,
        role: registerForm.role,
        full_name: registerForm.full_name.trim(),
        father_name:
          registerForm.role === "Student"
            ? registerForm.father_name.trim()
            : "",
        email: registerForm.email.trim(),
        age: registerForm.age ? Number(registerForm.age) : null,
        gender: registerForm.gender || null,
        institution_type: registerForm.institution_type,
        institution_name: FIXED_INSTITUTION_NAME,
        class_name: registerForm.class_name.trim(),
        section: registerForm.section.trim(),
        group_name:
          registerForm.institution_type === "College"
            ? registerForm.group_name
            : "",
        roll_number:
          registerForm.role === "Student"
            ? registerForm.roll_number.trim()
            : "",
        photo_url: photoUrl,
      };

      const { error: insertError } = await supabase
        .from("profiles")
        .insert(profileData);

      if (insertError) {
        throw new Error(
          `Your authentication account was created, but saving your profile failed: ${insertError.message}. Do not register again yet; check the profiles table first.`
        );
      }

      setSuccess(
        data.session
          ? "Registration successful! Your account is ready."
          : "Registration successful! Check your email if confirmation is required, then log in."
      );

      setRegisterForm(emptyProfile);
      setProfilePhoto(null);
      setAuthForm({
        email: registerForm.email.trim(),
        password: "",
      });
      setPage("login");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: authForm.email.trim(),
        password: authForm.password,
      });

      if (loginError) throw loginError;
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    setError("");

    try {
      const { error: logoutError } = await supabase.auth.signOut();
      if (logoutError) throw logoutError;

      setProfile(null);
      setSession(null);
      setHomework([]);
      setCompletions([]);
      setPage("login");
      setSuccess("You have logged out successfully.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSendHomework(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!subject.trim() || !homeworkText.trim() || !dueDate) {
      setError("Please enter the subject, homework, and due date.");
      return;
    }

    if (dueDate < todayString()) {
      setError("Please choose today or a future due date.");
      return;
    }

    if (!teacherClass.trim() || !teacherSection.trim()) {
      setError("Please select the teaching class and section.");
      return;
    }

    if (targetType === "student" && !targetStudentId) {
      setError("Please select a student for this homework.");
      return;
    }

    setBusy(true);

    try {
      const homeworkData = {
        teacher_id: session.user.id,
        institution_type: profile.institution_type,
        institution_name: FIXED_INSTITUTION_NAME,
        class_name: teacherClass.trim(),
        section: teacherSection.trim(),
        group_name: teacherGroup.trim(),
        subject: subject.trim(),
        homework: homeworkText.trim(),
        due_date: dueDate,
        target_type: targetType,
        target_student_id:
          targetType === "student" ? targetStudentId : null,
      };

      const { error: insertError } = await supabase
        .from("homework")
        .insert(homeworkData);

      if (insertError) throw insertError;

      setSubject("");
      setHomeworkText("");
      setDueDate("");
      setTargetStudentId("");
      setStudentSearch("");
      setSuccess("Homework sent successfully!");
      await loadDashboardData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleFinishHomework(item) {
    setError("");
    setSuccess("");
    setBusy(true);

    try {
      const existing = completions.find(
        (completion) => completion.homework_id === item.id
      );

      if (existing) {
        setSuccess("This homework is already marked as finished.");
        return;
      }

      const { error: finishError } = await supabase
        .from("homework_completions")
        .insert({
          homework_id: item.id,
          student_id: session.user.id,
          completed_at: new Date().toISOString(),
        });

      if (finishError) throw finishError;

      setSuccess("Finished! Your teacher can now see your completion.");
      await loadDashboardData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const currentStudentHomework = homework.filter((item) => {
    const finished = completions.some(
      (completion) => completion.homework_id === item.id
    );

    return !finished && (!item.due_date || item.due_date >= todayString());
  });

  const historyStudentHomework = homework.filter((item) => {
    const finished = completions.some(
      (completion) => completion.homework_id === item.id
    );

    return finished || (item.due_date && item.due_date < todayString());
  });

  const filteredStudents = students.filter((student) => {
    const classMatches = sameText(student.class_name, teacherClass);
    const sectionMatches = sameText(student.section, teacherSection);
    const groupMatches =
      !normalizeText(teacherGroup) ||
      sameText(student.group_name, teacherGroup);

    const searchText = normalizeText(studentSearch);
    const searchMatches =
      !searchText ||
      normalizeText(student.full_name).includes(searchText) ||
      normalizeText(student.roll_number).includes(searchText);

    return classMatches && sectionMatches && groupMatches && searchMatches;
  });

  const displayedHomework =
    profile?.role === "Student"
      ? activeTab === "history"
        ? historyStudentHomework
        : currentStudentHomework
      : homework;

  if (!authReady || loading) {
    return (
      <div className={`app-shell theme-${theme}`}>
        <div className="loading">
          <div className="spinner" />
          <h2>HOMEWORK DIARY</h2>
          <p>Loading your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-shell theme-${theme}`}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-logo">HD</div>
          <div>
            <h1>HOMEWORK DIARY</h1>
            <p>Learn • Organize • Achieve</p>
          </div>
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className="button secondary"
            onClick={() =>
              setTheme((current) =>
                current === "light" ? "dark" : "light"
              )
            }
          >
            {theme === "light" ? "🌙 Dark mode" : "☀️ Light mode"}
          </button>

          {profile && (
            <button
              type="button"
              className="button danger"
              onClick={handleLogout}
              disabled={busy}
            >
              Log out
            </button>
          )}
        </div>
      </header>

      <main className="page">
        {error && (
          <div className="error" role="alert">
            <strong>Notice:</strong> {error}
            <button
              type="button"
              className="message-close"
              onClick={() => setError("")}
              aria-label="Close error"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="success" role="status">
            {success}
            <button
              type="button"
              className="message-close"
              onClick={() => setSuccess("")}
              aria-label="Close message"
            >
              ×
            </button>
          </div>
        )}

        {page === "profile-missing" && (
          <section className="panel auth-card">
            <h2>Profile unavailable</h2>
            <p>
              Your login account exists, but your profile is missing or cannot
              be read. This cannot safely be fixed by creating another account.
            </p>
            <button
              className="button primary"
              onClick={handleLogout}
              disabled={busy}
            >
              Log out
            </button>
          </section>
        )}

        {(page === "login" || page === "register") && (
          <section className="auth-layout">
            <div className="auth-intro">
              <span className="eyebrow">YOUR LEARNING COMPANION</span>
              <h2>Every assignment, organized in one place.</h2>
              <p>
                Receive homework, keep track of deadlines, and let your
                teachers know when your work is finished.
              </p>
              <div className="feature-list">
                <div>✓ Homework in one place</div>
                <div>✓ Simple completion tracking</div>
                <div>✓ Student and teacher dashboards</div>
              </div>
            </div>

            <section className="panel auth-card">
              {page === "login" ? (
                <>
                  <h2>Welcome back!</h2>
                  <p className="muted">Log in to your account.</p>

                  <form onSubmit={handleLogin} className="form-stack">
                    <label>
                      Email address
                      <input
                        type="email"
                        autoComplete="email"
                        value={authForm.email}
                        onChange={(event) =>
                          setAuthForm({
                            ...authForm,
                            email: event.target.value,
                          })
                        }
                        placeholder="Enter your email"
                        required
                      />
                    </label>

                    <label>
                      Password
                      <input
                        type="password"
                        autoComplete="current-password"
                        value={authForm.password}
                        onChange={(event) =>
                          setAuthForm({
                            ...authForm,
                            password: event.target.value,
                          })
                        }
                        placeholder="Enter your password"
                        required
                      />
                    </label>

                    <button
                      className="button primary full-width"
                      disabled={busy}
                    >
                      {busy ? "Logging in..." : "Log in"}
                    </button>
                  </form>

                  <div className="auth-switch">
                    Don't have an account?
                    <button
                      className="text-button"
                      onClick={() => {
                        setError("");
                        setSuccess("");
                        setPage("register");
                      }}
                    >
                      Create New Account
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2>Create your account</h2>
                  <p className="muted">Complete the form to get started.</p>

                  <form
                    onSubmit={handleRegister}
                    className="form-stack"
                  >
                    <label>
                      Register as
                      <select
                        name="role"
                        value={registerForm.role}
                        onChange={updateRegisterField}
                      >
                        <option value="Student">Student</option>
                        <option value="Teacher">Teacher</option>
                      </select>
                    </label>

                    <label>
                      Full name
                      <input
                        name="full_name"
                        value={registerForm.full_name}
                        onChange={updateRegisterField}
                        placeholder="Enter full name"
                        required
                      />
                    </label>

                    {registerForm.role === "Student" && (
                      <label>
                        Father's name
                        <input
                          name="father_name"
                          value={registerForm.father_name}
                          onChange={updateRegisterField}
                          placeholder="Enter father's name"
                          required
                        />
                      </label>
                    )}

                    <label>
                      Email address
                      <input
                        type="email"
                        name="email"
                        autoComplete="email"
                        value={registerForm.email}
                        onChange={updateRegisterField}
                        placeholder="Enter email"
                        required
                      />
                    </label>

                    <label>
                      Password
                      <input
                        type="password"
                        name="password"
                        autoComplete="new-password"
                        value={registerForm.password}
                        onChange={updateRegisterField}
                        placeholder="At least 6 characters"
                        minLength={6}
                        required
                      />
                    </label>

                    <div className="two">
                      <label>
                        Age
                        <input
                          type="number"
                          name="age"
                          min="5"
                          max="100"
                          value={registerForm.age}
                          onChange={updateRegisterField}
                          placeholder="Age"
                        />
                      </label>

                      <label>
                        Gender
                        <select
                          name="gender"
                          value={registerForm.gender}
                          onChange={updateRegisterField}
                        >
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </label>
                    </div>

                    <label>
                      Institution
                      <input
                        value={FIXED_INSTITUTION_NAME}
                        readOnly
                      />
                    </label>

                    <label>
                      Institution type
                      <select
                        name="institution_type"
                        value={registerForm.institution_type}
                        onChange={updateRegisterField}
                        required
                      >
                        <option value="Primary School">Primary School</option>
                        <option value="Secondary School">
                          Secondary School
                        </option>
                        <option value="High School">High School</option>
                        <option value="College">College</option>
                      </select>
                    </label>

                    <div className="two">
                      <label>
                        Class
                        <input
                          name="class_name"
                          value={registerForm.class_name}
                          onChange={updateRegisterField}
                          placeholder="e.g. 9, 10, 11, 12"
                          required
                        />
                      </label>

                      <label>
                        Section
                        <input
                          name="section"
                          value={registerForm.section}
                          onChange={updateRegisterField}
                          placeholder="e.g. A, B, D"
                          required
                        />
                      </label>
                    </div>

                    {registerForm.institution_type === "College" && (
                      <label>
                        Group
                        <select
                          name="group_name"
                          value={registerForm.group_name}
                          onChange={updateRegisterField}
                          required
                        >
                          <option value="">Select group</option>
                          {GROUP_OPTIONS.map((group) => (
                            <option key={group} value={group}>
                              {group}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    {registerForm.role === "Student" && (
                      <label>
                        Roll number
                        <input
                          name="roll_number"
                          value={registerForm.roll_number}
                          onChange={updateRegisterField}
                          placeholder="Enter roll number"
                          required
                        />
                      </label>
                    )}

                    <label>
                      Profile photo (optional)
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          setProfilePhoto(event.target.files?.[0] || null)
                        }
                      />
                    </label>

                    <button
                      className="button primary full-width"
                      disabled={busy}
                    >
                      {busy ? "Creating account..." : "Create Account"}
                    </button>
                  </form>

                  <div className="auth-switch">
                    Already have an account?
                    <button
                      className="text-button"
                      onClick={() => {
                        setError("");
                        setSuccess("");
                        setPage("login");
                      }}
                    >
                      Log in
                    </button>
                  </div>
                </>
              )}
            </section>
          </section>
        )}

        {profile && (page === "student" || page === "teacher") && (
          <>
            <section className="profile-banner panel">
              <div className="profile-photo">
                {profile.photo_url ? (
                  <img src={profile.photo_url} alt="Profile" />
                ) : (
                  <div className="profile-placeholder">
                    {(profile.full_name || "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="profile-details">
                <span className="eyebrow">
                  {profile.role === "Teacher" ? "TEACHER ACCOUNT" : "STUDENT ACCOUNT"}
                </span>
                <h2>{profile.full_name}</h2>
                <p>{profile.institution_name}</p>
                <div className="profile-meta">
                  {profile.role === "Student" && profile.father_name && (
                    <span>Father: {profile.father_name}</span>
                  )}
                  <span>Class: {profile.class_name}</span>
                  <span>Section: {profile.section}</span>
                  {profile.role === "Student" && (
                    <span>Roll no: {profile.roll_number || "—"}</span>
                  )}
                  {profile.role === "Teacher" && profile.group_name && (
                    <span>Group: {profile.group_name}</span>
                  )}
                </div>
              </div>
            </section>

            {profile.role === "Student" ? (
              <section className="dashboard">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">STUDENT DASHBOARD</span>
                    <h2>Your homework</h2>
                  </div>
                  <button
                    className="button secondary"
                    onClick={loadDashboardData}
                  >
                    Refresh
                  </button>
                </div>

                <div className="stats-grid">
                  <div className="stat-card">
                    <span>Current homework</span>
                    <strong>{currentStudentHomework.length}</strong>
                  </div>
                  <div className="stat-card">
                    <span>Finished / history</span>
                    <strong>{historyStudentHomework.length}</strong>
                  </div>
                </div>

                <div className="tab-row">
                  <button
                    className={`button ${activeTab === "current" ? "primary" : "secondary"}`}
                    onClick={() => setActiveTab("current")}
                  >
                    Current Homework
                  </button>
                  <button
                    className={`button ${activeTab === "history" ? "primary" : "secondary"}`}
                    onClick={() => setActiveTab("history")}
                  >
                    History Homework
                  </button>
                </div>

                <div className="homework-list">
                  {displayedHomework.length === 0 ? (
                    <div className="empty-state panel">
                      <h3>No homework here yet</h3>
                      <p>
                        {activeTab === "history"
                          ? "Finished or past-due homework will appear here."
                          : "Your teacher's homework will appear here."}
                      </p>
                    </div>
                  ) : (
                    displayedHomework.map((item) => {
                      const finished = completions.some(
                        (completion) => completion.homework_id === item.id
                      );
                      const overdue =
                        item.due_date &&
                        item.due_date < todayString() &&
                        !finished;

                      return (
                        <article className="homework-card panel" key={item.id}>
                          <div className="homework-card-header">
                            <div>
                              <span className="eyebrow">{item.subject}</span>
                              <h3>{item.subject}</h3>
                            </div>
                            <span
                              className={`status-pill ${
                                finished
                                  ? "completed"
                                  : overdue
                                    ? "overdue"
                                    : "pending"
                              }`}
                            >
                              {finished
                                ? "Finished"
                                : overdue
                                  ? "Past due"
                                  : "Pending"}
                            </span>
                          </div>

                          <p className="homework-content">{item.homework}</p>
                          <div className="homework-meta">
                            <span>Due: {formatDate(item.due_date)}</span>
                            <span>Class: {item.class_name}</span>
                            <span>Section: {item.section}</span>
                          </div>

                          {!finished &&
                            !overdue &&
                            activeTab === "current" && (
                              <button
                                className="button primary"
                                onClick={() => handleFinishHomework(item)}
                                disabled={busy}
                              >
                                Finished
                              </button>
                            )}
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            ) : (
              <section className="dashboard">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">TEACHER DASHBOARD</span>
                    <h2>Manage homework</h2>
                  </div>
                  <button
                    className="button secondary"
                    onClick={loadDashboardData}
                  >
                    Refresh
                  </button>
                </div>

                <div className="stats-grid">
                  <div className="stat-card">
                    <span>Homework sent</span>
                    <strong>{homework.length}</strong>
                  </div>
                  <div className="stat-card">
                    <span>Finished submissions</span>
                    <strong>{completions.length}</strong>
                  </div>
                  <div className="stat-card">
                    <span>Students in institution</span>
                    <strong>{students.length}</strong>
                  </div>
                </div>

                <div className="panel">
                  <h3 className="section-title">Select your teaching class</h3>
                  <p className="muted">
                    You can change the class, section, and group for each
                    teaching assignment.
                  </p>

                  <div className="two">
                    <label>
                      Class
                      <input
                        value={teacherClass}
                        onChange={(event) => setTeacherClass(event.target.value)}
                        placeholder="Enter class"
                      />
                    </label>
                    <label>
                      Section
                      <input
                        value={teacherSection}
                        onChange={(event) =>
                          setTeacherSection(event.target.value)
                        }
                        placeholder="Enter section"
                      />
                    </label>
                  </div>

                  <label>
                    Group
                    <select
                      value={teacherGroup}
                      onChange={(event) => setTeacherGroup(event.target.value)}
                    >
                      <option value="">No group / all groups</option>
                      {GROUP_OPTIONS.map((group) => (
                        <option key={group} value={group}>
                          {group}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="panel">
                  <h3 className="section-title">Send homework</h3>

                  <form
                    onSubmit={handleSendHomework}
                    className="form-stack"
                  >
                    <label>
                      Subject
                      <input
                        value={subject}
                        onChange={(event) => setSubject(event.target.value)}
                        placeholder="e.g. Mathematics"
                        required
                      />
                    </label>

                    <label>
                      Homework details
                      <textarea
                        rows={5}
                        value={homeworkText}
                        onChange={(event) =>
                          setHomeworkText(event.target.value)
                        }
                        placeholder="Write the homework instructions..."
                        required
                      />
                    </label>

                    <label>
                      Due date
                      <input
                        type="date"
                        min={todayString()}
                        value={dueDate}
                        onChange={(event) => setDueDate(event.target.value)}
                        required
                      />
                    </label>

                    <label>
                      Send to
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
                      <>
                        <label>
                          Search student by name or roll number
                          <input
                            value={studentSearch}
                            onChange={(event) =>
                              setStudentSearch(event.target.value)
                            }
                            placeholder="Search student..."
                          />
                        </label>

                        <label>
                          Select student
                          <select
                            value={targetStudentId}
                            onChange={(event) =>
                              setTargetStudentId(event.target.value)
                            }
                            required
                          >
                            <option value="">Choose a student</option>
                            {filteredStudents.map((student) => (
                              <option key={student.id} value={student.id}>
                                {student.full_name} — Roll{" "}
                                {student.roll_number || "N/A"}
                              </option>
                            ))}
                          </select>
                        </label>

                        {filteredStudents.length === 0 && (
                          <p className="muted">
                            No students match this class, section, group, and
                            search. Check the selections and student profiles.
                          </p>
                        )}
                      </>
                    )}

                    <button
                      className="button primary"
                      disabled={busy}
                    >
                      {busy ? "Sending..." : "Send Homework"}
                    </button>
                  </form>
                </div>

                <div className="panel">
                  <h3 className="section-title">Homework sent and completion status</h3>

                  {homework.length === 0 ? (
                    <div className="empty-state">
                      <p>You have not sent any homework yet.</p>
                    </div>
                  ) : (
                    <div className="homework-list">
                      {homework.map((item) => {
                        const itemCompletions = completions.filter(
                          (completion) => completion.homework_id === item.id
                        );

                        const targetedStudent = students.find(
                          (student) => student.id === item.target_student_id
                        );

                        return (
                          <article
                            className="homework-card panel"
                            key={item.id}
                          >
                            <div className="homework-card-header">
                              <div>
                                <span className="eyebrow">{item.subject}</span>
                                <h3>{item.subject}</h3>
                              </div>
                              <span className="status-pill pending">
                                {item.target_type === "student" ||
                                item.target_type === "specific_student"
                                  ? "Specific student"
                                  : "Entire class"}
                              </span>
                            </div>

                            <p className="homework-content">{item.homework}</p>
                            <div className="homework-meta">
                              <span>Due: {formatDate(item.due_date)}</span>
                              <span>Class: {item.class_name}</span>
                              <span>Section: {item.section}</span>
                              {item.group_name && (
                                <span>Group: {item.group_name}</span>
                              )}
                            </div>

                            {targetedStudent && (
                              <p>
                                <strong>Assigned to:</strong>{" "}
                                {targetedStudent.full_name}
                              </p>
                            )}

                            <div className="completion-summary">
                              <strong>
                                Finished submissions: {itemCompletions.length}
                              </strong>

                              {itemCompletions.length === 0 ? (
                                <p className="muted">
                                  No completion has been recorded yet.
                                </p>
                              ) : (
                                <ul>
                                  {itemCompletions.map((completion) => {
                                    const student = students.find(
                                      (candidate) =>
                                        candidate.id === completion.student_id
                                    );

                                    return (
                                      <li key={completion.id}>
                                        {student?.full_name ||
                                          "Student"}{" "}
                                        {student?.roll_number
                                          ? `(Roll ${student.roll_number})`
                                          : ""}{" "}
                                        — Finished{" "}
                                        {completion.completed_at
                                          ? new Date(
                                              completion.completed_at
                                            ).toLocaleString()
                                          : ""}
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}

        <footer className="app-footer">
          <strong>HOMEWORK DIARY</strong>
          <p>Learn • Organize • Achieve</p>
        </footer>
      </main>
    </div>
  );
}

export default App;
