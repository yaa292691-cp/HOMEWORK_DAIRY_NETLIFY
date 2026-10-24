import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import "./styles.css";

const FIXED_INSTITUTION_NAME = "PUBLIC SCHOOL AND COLLEGE SKARDU";
const GROUP_OPTIONS = ["COMPUTER SCIENCE", "PREMEDICAL", "ENGINEERING"];
const CLASS_OPTIONS = [
  "PLAY GROUP", "NURSERY", "PREP", "ONE", "TWO", "THREE", "FOUR",
  "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "1st YEAR", "2nd YEAR",
];
const LETTER_SECTIONS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const COLOR_SECTIONS = [
  "RED", "GREEN", "BLUE", "PINK", "YELLOW", "ORANGE", "PURPLE",
  "WHITE", "BLACK", "BROWN", "GREY", "GRAY",
];

function getSectionType(section) {
  const value = String(section || "").trim().toUpperCase();
  if (!value || LETTER_SECTIONS.includes(value)) return "letters";
  return "colors";
}

function getClassOption(className) {
  return CLASS_OPTIONS.find((name) => normalizeText(name) === normalizeText(className)) || "";
}

const emptyProfile = {
  role: "Student",
  full_name: "",
  father_name: "",
  email: "",
  password: "",
  age: "",
  gender: "",
  institution_type: "",
  institution_name: FIXED_INSTITUTION_NAME,
  class_name: "",
  section: "",
  section_type: "letters",
  group_name: "",
  roll_number: "",
};

// Treat capitalization and repeated/leading/trailing spaces as equivalent.
function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

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
          isProfileIncomplete(profile) ? (
            <CompleteProfilePage
              profile={profile}
              userEmail={session.user.email || profile.email || ""}
              onSaved={(updatedProfile) => {
                setProfile(updatedProfile);
                setError("");
                setSuccess("Your profile has been saved.");
              }}
              setGlobalError={setError}
            />
          ) : profile.role === "Teacher" ? (
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
      const email = form.email.trim();
      const metadata = {
        role: form.role,
        full_name: form.full_name.trim(),
        father_name: form.role === "Student" ? form.father_name.trim() : null,
        email,
        age: form.age ? Number(form.age) : null,
        gender: form.gender || null,
        institution_type: form.institution_type,
        institution_name: FIXED_INSTITUTION_NAME,
        class_name: form.class_name.trim(),
        section: form.section.trim(),
        group_name: form.group_name.trim() || null,
        roll_number:
          form.role === "Student" ? form.roll_number.trim() || null : null,
      };

      // Store profile fields in Auth metadata too. If Supabase requires email
      // confirmation, the database trigger can create the profile without an
      // authenticated browser session.
      const { data: authData, error: authError } =
        await supabase.auth.signUp({
          email,
          password: form.password,
          options: { data: metadata },
        });

      if (authError) throw authError;

      const user = authData.user;

      if (!user) {
        throw new Error("Account could not be created. Please try again.");
      }

      // When email confirmation is enabled, there is no signed-in session yet.
      // Avoid a browser-side profile upsert that would fail RLS. The profile
      // trigger should use the metadata above; the user can complete a missing
      // profile after signing in.
      if (!authData.session) {
        setSuccess(
          "Your account was created. Check your email to confirm it, then log in. Your profile details were included with the account."
        );
        return;
      }

      let photoUrl = null;

      if (photo) {
        const extension = photo.name.split(".").pop() || "jpg";
        const filePath = `${user.id}/profile-${Date.now()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("profile-photos")
          .upload(filePath, photo, {
            upsert: true,
            contentType: photo.type || "image/jpeg",
          });

        if (uploadError) {
          throw new Error(
            "Account created, but photo upload failed: " +
              uploadError.message
          );
        }

        const { data: photoData } = supabase.storage
          .from("profile-photos")
          .getPublicUrl(filePath);

        photoUrl = photoData.publicUrl;
      }

      const profileData = {
        id: user.id,
        role: form.role,
        full_name: form.full_name.trim(),
        father_name:
          form.role === "Student" ? form.father_name.trim() : null,
        email,
        age: form.age ? Number(form.age) : null,
        gender: form.gender || null,
        institution_type: form.institution_type,
        institution_name: FIXED_INSTITUTION_NAME,
        class_name: form.class_name.trim(),
        section: form.section.trim(),
        group_name: form.group_name.trim() || null,
        roll_number:
          form.role === "Student"
            ? form.roll_number.trim() || null
            : null,
        photo_url: photoUrl,
      };

      // Prefer updating a row that an Auth database trigger may already have
      // created. Only insert when no row exists. If a trigger creates the row
      // between the check and insert, retry the update after a duplicate-key
      // response instead of leaving the profile blank.
      const { data: updatedRows, error: updateProfileError } = await supabase
        .from("profiles")
        .update(profileData)
        .eq("id", user.id)
        .select("id");

      if (updateProfileError) {
        throw new Error(
          "Your account was created, but updating its profile failed: " +
            updateProfileError.message
        );
      }

      if (!updatedRows || updatedRows.length === 0) {
        const { error: insertProfileError } = await supabase
          .from("profiles")
          .insert(profileData);

        if (insertProfileError) {
          // A trigger may have inserted the row just before our insert.
          // Retry as an update only for a duplicate-key error.
          if (insertProfileError.code === "23505") {
            const { data: retryRows, error: retryError } = await supabase
              .from("profiles")
              .update(profileData)
              .eq("id", user.id)
              .select("id");

            if (retryError || !retryRows || retryRows.length === 0) {
              throw new Error(
                "Your account was created, but its existing profile could not be updated. " +
                  (retryError?.message || insertProfileError.message)
              );
            }
          } else {
            throw new Error(
              "Your account was created, but the profile could not be saved: " +
                insertProfileError.message
            );
          }
        }
      }

      if (authData.session) {
        setSuccess(
          "Your account and profile were created. If your dashboard does not open, log in using your new account."
        );
      } else {
        setSuccess(
          "Your account was created. Check your email if confirmation is required, then log in."
        );
      }
    } catch (err) {
      setError(err.message || "Registration failed.");
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
                value={FIXED_INSTITUTION_NAME}
                readOnly
                aria-readonly="true"
                required
              />
              <small>Your institution is fixed for this school.</small>
            </label>

            <label className="field">
              <span>Class</span>
              <select name="class_name" value={form.class_name} onChange={updateField} required>
                <option value="">Select class</option>
                {CLASS_OPTIONS.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>

            <label className="field">
              <span>Section type</span>
              <select
                name="section_type"
                value={form.section_type}
                onChange={(event) => setForm((previous) => ({
                  ...previous,
                  section_type: event.target.value,
                  section: "",
                }))}
                required
              >
                <option value="letters">Alphabetical (A–Z)</option>
                <option value="colors">Color names</option>
              </select>
            </label>

            <label className="field">
              <span>Section name</span>
              <select name="section" value={form.section} onChange={updateField} required>
                <option value="">Select section</option>
                {(form.section_type === "letters" ? LETTER_SECTIONS : COLOR_SECTIONS).map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>

            {(form.institution_type === "High School" ||
              form.institution_type === "College") && (
              <label className="field">
                <span>Group</span>
                <select
                  name="group_name"
                  value={form.group_name}
                  onChange={updateField}
                >
                  <option value="">Select group</option>
                  {GROUP_OPTIONS.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
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

function isProfileIncomplete(profile) {
  if (!profile) return true;
  const commonMissing =
    !String(profile.full_name || "").trim() ||
    !String(profile.institution_type || "").trim() ||
    !String(profile.class_name || "").trim() ||
    !String(profile.section || "").trim();
  if (commonMissing) return true;
  if (profile.role === "Student") {
    return (
      !String(profile.father_name || "").trim() ||
      !String(profile.roll_number || "").trim()
    );
  }
  return false;
}

function CompleteProfilePage({ profile, userEmail, onSaved, setGlobalError }) {
  const [form, setForm] = useState({
    role: profile.role === "Teacher" ? "Teacher" : "Student",
    full_name: profile.full_name || "",
    father_name: profile.father_name || "",
    email: profile.email || userEmail || "",
    age: profile.age == null ? "" : String(profile.age),
    gender: profile.gender || "",
    institution_type: profile.institution_type || "",
    class_name: getClassOption(profile.class_name),
    section: (getSectionType(profile.section) === "letters" ? LETTER_SECTIONS : COLOR_SECTIONS).includes(String(profile.section || "").trim().toUpperCase()) ? String(profile.section).trim().toUpperCase() : "",
    section_type: getSectionType(profile.section),
    group_name: profile.group_name || "",
    roll_number: profile.roll_number || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function saveProfile(event) {
    event.preventDefault();
    setError("");
    setGlobalError("");

    if (!form.full_name.trim() || !form.email.trim() || !form.institution_type || !form.class_name.trim() || !form.section.trim()) {
      setError("Please complete your name, email address, institution type, class, and section.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (form.role === "Student" && (!form.father_name.trim() || !form.roll_number.trim())) {
      setError("Students must enter father name and roll number.");
      return;
    }
    if ((form.institution_type === "High School" || form.institution_type === "College") && !form.group_name) {
      setError("Please select your group.");
      return;
    }

    setSaving(true);
    const updateData = {
      // Save the account type explicitly selected by the user during setup.
      role: form.role === "Teacher" ? "Teacher" : "Student",
      full_name: form.full_name.trim(),
      father_name: form.role === "Student" ? form.father_name.trim() : null,
      email: form.email.trim(),
      age: form.age ? Number(form.age) : null,
      gender: form.gender || null,
      institution_type: form.institution_type,
      institution_name: FIXED_INSTITUTION_NAME,
      class_name: form.class_name.trim(),
      section: form.section.trim(),
      group_name: form.institution_type === "High School" || form.institution_type === "College" ? (form.group_name || null) : null,
      roll_number: form.role === "Student" ? form.roll_number.trim() : null,
    };

    const { data, error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", profile.id)
      .select("*")
      .maybeSingle();

    if (updateError) {
      setError("Could not update your existing profile: " + updateError.message);
    } else if (!data) {
      setError("Your profile was not updated. Please check that your Supabase profiles table allows users to update their own profile row.");
    } else {
      onSaved(data);
    }
    setSaving(false);
  }

  return (
    <section className="register-layout">
      <div className="register-heading">
        <span className="eyebrow">ONE-TIME SETUP</span>
        <h1>Complete your profile</h1>
        <p>Your account already exists. Fill in these details to finish setting up your HOMEWORK DIARY profile. You do not need to register again.</p>
      </div>
      <div className="auth-card register-card">
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={saveProfile} className="form-stack">
          <div className="form-grid">
            <label className="field">
              <span>Account type</span>
              <select name="role" value={form.role} onChange={updateField} required>
                <option value="Student">Student</option>
                <option value="Teacher">Teacher</option>
              </select>
              <small>Select whether this profile is for a student or teacher.</small>
            </label>
            <label className="field">
              <span>Full name</span>
              <input name="full_name" value={form.full_name} onChange={updateField} required />
            </label>
            {form.role === "Student" && (
              <label className="field">
                <span>Father name</span>
                <input name="father_name" value={form.father_name} onChange={updateField} required />
              </label>
            )}
            <label className="field">
              <span>Email address</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={updateField}
                placeholder="Enter your email address"
                autoComplete="email"
                required
              />
              <small>Enter the email address you want saved in your profile.</small>
            </label>
            <label className="field">
              <span>Age</span>
              <input type="number" name="age" value={form.age} onChange={updateField} min="1" max="120" />
            </label>
            <label className="field">
              <span>Gender</span>
              <select name="gender" value={form.gender} onChange={updateField}>
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label className="field">
              <span>Institution type</span>
              <select name="institution_type" value={form.institution_type} onChange={updateField} required>
                <option value="">Select institution type</option>
                <option value="Primary School">Primary School</option>
                <option value="Secondary School">Secondary School</option>
                <option value="High School">High School</option>
                <option value="College">College</option>
              </select>
            </label>
            <label className="field field-wide">
              <span>Institution name</span>
              <input value={FIXED_INSTITUTION_NAME} readOnly aria-readonly="true" />
            </label>
            <label className="field">
              <span>Class</span>
              <select name="class_name" value={form.class_name} onChange={updateField} required>
                <option value="">Select class</option>
                {CLASS_OPTIONS.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Section type</span>
              <select
                name="section_type"
                value={form.section_type}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  section_type: event.target.value,
                  section: "",
                }))}
                required
              >
                <option value="letters">Alphabetical (A–Z)</option>
                <option value="colors">Color names</option>
              </select>
            </label>
            <label className="field">
              <span>Section name</span>
              <select name="section" value={form.section} onChange={updateField} required>
                <option value="">Select section</option>
                {(form.section_type === "letters" ? LETTER_SECTIONS : COLOR_SECTIONS).map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>
            {(form.institution_type === "High School" || form.institution_type === "College") && (
              <label className="field">
                <span>Group</span>
                <select name="group_name" value={form.group_name} onChange={updateField} required>
                  <option value="">Select group</option>
                  {GROUP_OPTIONS.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </label>
            )}
            {form.role === "Student" && (
              <label className="field">
                <span>Roll number</span>
                <input name="roll_number" value={form.roll_number} onChange={updateField} required />
              </label>
            )}
          </div>
          <button type="submit" className="button button-primary button-full" disabled={saving}>
            {saving ? "Saving profile..." : "Save Profile and Continue"}
          </button>
        </form>
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
  const [homeworkViews, setHomeworkViews] = useState([]);
  const [selectedClass, setSelectedClass] = useState(getClassOption(profile.class_name));
  const [selectedSectionType, setSelectedSectionType] = useState(getSectionType(profile.section));
  const [selectedSection, setSelectedSection] = useState(
    String(profile.section || "").trim().toUpperCase()
  );
  const [subject, setSubject] = useState("");
  const [homeworkText, setHomeworkText] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [targetType, setTargetType] = useState("class");
  const [targetStudentId, setTargetStudentId] = useState("");
  const [homeworkTab, setHomeworkTab] = useState("current");
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
      .eq("role", "Student");

    if (studentError) {
      setError("Could not load students: " + studentError.message);
      setLoading(false);
      return;
    }

    const sameInstitutionStudents = (studentData || []).filter((student) =>
      normalizeText(student.institution_name) === normalizeText(profile.institution_name)
    );
    setStudents(sameInstitutionStudents);

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

    const items = homeworkData || [];
    setHomeworkList(items);
    const homeworkIds = items.map((item) => item.id);

    if (homeworkIds.length) {
      const [completionResult, viewsResult] = await Promise.all([
        supabase.from("homework_completions").select("*").in("homework_id", homeworkIds),
        supabase.from("homework_views").select("*").in("homework_id", homeworkIds),
      ]);

      if (completionResult.error) {
        setError("Could not load finished homework counts: " + completionResult.error.message);
      } else {
        setCompletions(completionResult.data || []);
      }

      if (viewsResult.error) {
        setError((previous) => previous || ("Could not load homework view counts: " + viewsResult.error.message));
        setHomeworkViews([]);
      } else {
        setHomeworkViews(viewsResult.data || []);
      }
    } else {
      setCompletions([]);
      setHomeworkViews([]);
    }

    setLoading(false);
  }

  const matchingStudents = students.filter((student) => {
    if (
      normalizeText(student.class_name) !== normalizeText(selectedClass) ||
      normalizeText(student.section) !== normalizeText(selectedSection)
    ) return false;

    if (profile.institution_type === "High School" || profile.institution_type === "College") {
      return normalizeText(student.group_name) === normalizeText(profile.group_name);
    }
    return true;
  });

  async function sendHomework(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (targetType === "student" && !targetStudentId) {
      setError("Please select a student.");
      return;
    }
    if (!selectedClass.trim() || !selectedSection.trim()) {
      setError("Please select the class and section for this homework.");
      return;
    }
    if (!subject.trim() || !homeworkText.trim() || !dueDate) {
      setError("Please enter the subject, homework details, and due date.");
      return;
    }
    if (targetType === "student" && !matchingStudents.some((student) => student.id === targetStudentId)) {
      setError("Please select a student from the selected class and section.");
      return;
    }

    setSending(true);
    // Use recipient_user_id, which is the actual column in the supplied SQL schema.
    const newHomework = {
      teacher_id: profile.id,
      subject: subject.trim(),
      homework_text: homeworkText.trim(),
      due_date: dueDate,
      recipient_user_id: targetType === "student" ? targetStudentId : null,
      recipient_institution_name: profile.institution_name,
      recipient_class_name: selectedClass.trim(),
      recipient_section: selectedSection.trim(),
      recipient_group_name: profile.group_name || null,
    };

    const { error: insertError } = await supabase.from("homework").insert(newHomework);
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

  function getCountForHomework(rows, homeworkId) {
    return rows.filter((row) => String(row.homework_id) === String(homeworkId)).length;
  }

  function getStudentName(studentId) {
    return students.find((student) => student.id === studentId)?.full_name || "Selected student";
  }

  const today = new Date().toLocaleDateString("en-CA");
  const currentHomework = homeworkList.filter((item) => !item.due_date || item.due_date >= today);
  const historyHomework = homeworkList.filter((item) => item.due_date && item.due_date < today);
  const displayedHomework = homeworkTab === "current" ? currentHomework : historyHomework;

  return (
    <div className="dashboard">
      <ProfileCard profile={profile} onLogout={onLogout} />
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">YOUR WORKSPACE</span>
          <h1>Teacher Dashboard</h1>
          <p>Share assignments and view student activity counts.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><span className="stat-icon stat-blue">▤</span><div><span className="stat-label">Homework sent</span><strong>{homeworkList.length}</strong></div></div>
        <div className="stat-card"><span className="stat-icon stat-green">✓</span><div><span className="stat-label">Finished responses</span><strong>{completions.length}</strong></div></div>
        <div className="stat-card"><span className="stat-icon stat-violet">♙</span><div><span className="stat-label">Matching students</span><strong>{matchingStudents.length}</strong></div></div>
      </div>

      <section className="panel">
        <div className="section-heading"><div className="section-icon">＋</div><div><h2>Send Homework</h2><p>Create an assignment for your class or one student.</p></div></div>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        <form onSubmit={sendHomework} className="form-stack">
          <div className="form-grid">
            <label className="field"><span>Class to teach</span><select value={selectedClass} onChange={(event) => { setSelectedClass(event.target.value); setTargetStudentId(""); }} required><option value="">Select class</option>{CLASS_OPTIONS.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
            <label className="field"><span>Section type</span><select value={selectedSectionType} onChange={(event) => { setSelectedSectionType(event.target.value); setSelectedSection(""); setTargetStudentId(""); }} required><option value="letters">Alphabetical (A–Z)</option><option value="colors">Color names</option></select></label>
            <label className="field"><span>Section name</span><select value={selectedSection} onChange={(event) => { setSelectedSection(event.target.value); setTargetStudentId(""); }} required><option value="">Select section</option>{(selectedSectionType === "letters" ? LETTER_SECTIONS : COLOR_SECTIONS).map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
            <label className="field"><span>Subject</span><input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. Mathematics" required /></label>
            <label className="field"><span>Due date</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} min={new Date().toLocaleDateString("en-CA")} required /></label>
            <label className="field field-wide"><span>Homework instructions</span><textarea value={homeworkText} onChange={(event) => setHomeworkText(event.target.value)} placeholder="Write the homework details..." rows={4} required /></label>
            <label className="field"><span>Send to</span><select value={targetType} onChange={(event) => { setTargetType(event.target.value); setTargetStudentId(""); }}><option value="class">Entire Matching Class</option><option value="student">Specific Student</option></select></label>
            {targetType === "student" && <label className="field"><span>Select student</span><select value={targetStudentId} onChange={(event) => setTargetStudentId(event.target.value)} required><option value="">Choose a student</option>{matchingStudents.map((student) => <option key={student.id} value={student.id}>{student.full_name}{student.roll_number ? ` — Roll ${student.roll_number}` : ""}</option>)}</select>{matchingStudents.length === 0 && <small>No matching students found for this class and section.</small>}</label>}
          </div>
          <div className="form-actions"><button type="submit" className="button button-primary" disabled={sending}>{sending ? "Sending..." : "Send Homework"}{!sending && <span aria-hidden="true"> →</span>}</button></div>
        </form>
      </section>

      <section className="panel">
        <div className="section-heading"><div className="section-icon">▤</div><div><h2>Homework</h2><p>Only totals are shown for students who viewed or finished each assignment.</p></div></div>
        <div className="homework-tabs" role="tablist" aria-label="Teacher homework sections">
          <button type="button" className={`homework-tab ${homeworkTab === "current" ? "is-active" : ""}`} onClick={() => setHomeworkTab("current")}>Current Homework <span>{currentHomework.length}</span></button>
          <button type="button" className={`homework-tab ${homeworkTab === "history" ? "is-active" : ""}`} onClick={() => setHomeworkTab("history")}>Homework History <span>{historyHomework.length}</span></button>
        </div>
        {loading ? <p className="empty-state">Loading homework...</p> : displayedHomework.length === 0 ? (
          <EmptyState icon="▤" title={homeworkTab === "current" ? "No current homework" : "No homework history yet"} message={homeworkTab === "current" ? "New assignments with upcoming due dates will appear here." : "Assignments will appear here after their due dates pass."} />
        ) : (
          <div className="homework-list">
            {displayedHomework.map((item) => {
              const viewedCount = getCountForHomework(homeworkViews, item.id);
              const finishedCount = getCountForHomework(completions, item.id);
              const isSpecificStudent = Boolean(item.recipient_user_id);
              return <article className="homework-card" key={item.id}>
                <div className="homework-card-top"><span className="subject-tag">{item.subject}</span><span className={`status-pill ${homeworkTab === "history" ? "status-muted" : "status-blue"}`}>{homeworkTab === "history" ? "Past due" : "Current"}</span></div>
                <h3>{item.subject}</h3><p className="homework-description">{item.homework_text}</p>
                <div className="homework-meta"><span><strong>Due:</strong> {item.due_date || "No due date"}</span><span><strong>Sent to:</strong> {isSpecificStudent ? getStudentName(item.recipient_user_id) : "Entire Matching Class"}</span></div>
                <div className="homework-counts"><div><span className="count-label">Students who viewed</span><strong>{viewedCount}</strong></div><div><span className="count-label">Students who finished</span><strong>{finishedCount}</strong></div></div>
              </article>;
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
  const [homeworkTab, setHomeworkTab] = useState("current");

  useEffect(() => {
    loadStudentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  async function loadStudentData() {
    setLoading(true);
    setError("");
    const { data: allHomework, error: homeworkError } = await supabase
      .from("homework").select("*").order("created_at", { ascending: false });

    if (homeworkError) {
      setError("Could not load homework: " + homeworkError.message);
      setLoading(false);
      return;
    }

    const matchingHomework = (allHomework || []).filter((item) => {
      if (item.recipient_user_id) return item.recipient_user_id === profile.id;
      if (
        normalizeText(item.recipient_institution_name) !== normalizeText(profile.institution_name) ||
        normalizeText(item.recipient_class_name) !== normalizeText(profile.class_name) ||
        normalizeText(item.recipient_section) !== normalizeText(profile.section)
      ) return false;
      if (profile.institution_type === "High School" || profile.institution_type === "College") {
        return normalizeText(item.recipient_group_name) === normalizeText(profile.group_name);
      }
      return true;
    });
    setHomeworkList(matchingHomework);

    // Record one view per student and homework. The composite primary key prevents duplicates.
    if (matchingHomework.length) {
      const viewRows = matchingHomework.map((item) => ({ homework_id: item.id, student_id: profile.id }));
      const { error: viewsError } = await supabase.from("homework_views").upsert(viewRows, {
        onConflict: "homework_id,student_id",
        ignoreDuplicates: true,
      });
      if (viewsError) setError("Homework loaded, but view tracking failed: " + viewsError.message);
    }

    const ids = matchingHomework.map((item) => item.id);
    if (ids.length) {
      const { data: completionData, error: completionError } = await supabase
        .from("homework_completions").select("*").eq("student_id", profile.id).in("homework_id", ids);
      if (completionError) setError("Could not load finished homework: " + completionError.message);
      else setCompletions(completionData || []);
    } else {
      setCompletions([]);
    }
    setLoading(false);
  }

  function isFinished(homeworkId) {
    return completions.some((item) => String(item.homework_id) === String(homeworkId));
  }

  async function finishHomework(item) {
    if (isFinished(item.id)) return;
    setError("");
    setWorkingId(item.id);
    const { data, error: completionError } = await supabase
      .from("homework_completions")
      .upsert({ homework_id: item.id, student_id: profile.id }, { onConflict: "homework_id,student_id", ignoreDuplicates: true })
      .select().maybeSingle();

    if (completionError) {
      setError("Could not mark homework as finished: " + completionError.message);
    } else if (data) {
      setCompletions((previous) => previous.some((row) => String(row.homework_id) === String(item.id)) ? previous : [...previous, data]);
    } else {
      // The row may already exist if the button was pressed twice; reload to sync status.
      await loadStudentData();
    }
    setWorkingId(null);
  }

  const today = new Date().toLocaleDateString("en-CA");
  // Keep completed work in Current Homework until its due date has passed.
  const currentHomework = homeworkList.filter((item) => !item.due_date || item.due_date >= today);
  const historyHomework = homeworkList.filter((item) => item.due_date && item.due_date < today);
  const displayedHomework = homeworkTab === "current" ? currentHomework : historyHomework;

  return (
    <div className="dashboard">
      <ProfileCard profile={profile} onLogout={onLogout} />
      <div className="dashboard-heading"><div><span className="eyebrow">YOUR LEARNING SPACE</span><h1>Student Dashboard</h1><p>Keep up with your assignments, one task at a time.</p></div></div>
      <div className="stats-grid stats-grid-student">
        <div className="stat-card"><span className="stat-icon stat-blue">▤</span><div><span className="stat-label">Current homework</span><strong>{currentHomework.length}</strong></div></div>
        <div className="stat-card"><span className="stat-icon stat-green">✓</span><div><span className="stat-label">Finished</span><strong>{completions.length}</strong></div></div>
        <div className="stat-card"><span className="stat-icon stat-violet">◷</span><div><span className="stat-label">Homework history</span><strong>{historyHomework.length}</strong></div></div>
      </div>
      <section className="panel">
        <div className="section-heading"><div className="section-icon">▤</div><div><h2>My Homework</h2><p>Assignments move to history after their due date.</p></div></div>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="homework-tabs" role="tablist" aria-label="Student homework sections">
          <button type="button" className={`homework-tab ${homeworkTab === "current" ? "is-active" : ""}`} onClick={() => setHomeworkTab("current")}>Current Homework <span>{currentHomework.length}</span></button>
          <button type="button" className={`homework-tab ${homeworkTab === "history" ? "is-active" : ""}`} onClick={() => setHomeworkTab("history")}>Homework History <span>{historyHomework.length}</span></button>
        </div>
        {loading ? <p className="empty-state">Loading homework...</p> : displayedHomework.length === 0 ? (
          <EmptyState icon={homeworkTab === "current" ? "✓" : "◷"} title={homeworkTab === "current" ? "No current homework" : "Your history is empty"} message={homeworkTab === "current" ? "New assignments will appear here." : "Assignments will appear here after their due dates pass."} />
        ) : (
          <div className="homework-list">
            {displayedHomework.map((item) => {
              const finished = isFinished(item.id);
              return <article className="homework-card" key={item.id}>
                <div className="homework-card-top"><span className="subject-tag">{item.subject}</span><span className={`status-pill ${finished ? "status-green" : homeworkTab === "history" ? "status-muted" : "status-blue"}`}>{finished ? "✓ Finished" : homeworkTab === "history" ? "Past due" : "To do"}</span></div>
                <h3>{item.subject}</h3><p className="homework-description">{item.homework_text}</p>
                <div className="homework-meta"><span><strong>Due:</strong> {item.due_date || "No due date"}</span></div>
                {homeworkTab === "current" && <div className="homework-card-actions"><button type="button" className="button button-primary" onClick={() => finishHomework(item)} disabled={finished || workingId === item.id}>{workingId === item.id ? "Saving..." : finished ? "✓ Finished" : "Finished"}</button></div>}
              </article>;
            })}
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
