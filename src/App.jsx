import React, {
  useEffect,
  useState,
} from "react";

import { supabase } from "./lib/supabase";


/* ============================================================
   MAIN APP
   ============================================================ */

function App() {
  const [session, setSession] =
    useState(null);

  const [profile, setProfile] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [page, setPage] =
    useState("login");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");


  /* ==========================================================
     START APPLICATION
     ========================================================== */

  useEffect(() => {
    loadSession();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        async (
          _event,
          newSession
        ) => {

          setSession(
            newSession
          );

          if (newSession) {
            await loadProfile(
              newSession.user.id
            );
          } else {
            setProfile(null);
          }

          setLoading(false);
        }
      );

    return () => {
      subscription.unsubscribe();
    };
  }, []);


  /* ==========================================================
     LOAD SESSION
     ========================================================== */

  async function loadSession() {
    try {

      const {
        data: {
          session:
            currentSession,
        },
      } =
        await supabase.auth.getSession();

      setSession(
        currentSession
      );

      if (currentSession) {

        await loadProfile(
          currentSession.user.id
        );

      }

    } catch (err) {

      console.error(err);

      setError(
        err.message
      );

    } finally {

      setLoading(false);

    }
  }


  /* ==========================================================
     LOAD PROFILE
     ========================================================== */

  async function loadProfile(
    userId
  ) {

    const {
      data,
      error:
        profileError,
    } =
      await supabase
        .from("profiles")
        .select("*")
        .eq(
          "id",
          userId
        )
        .single();

    if (profileError) {

      console.error(
        "Profile loading error:",
        profileError
      );

      setProfile(null);

      return;
    }

    setProfile(data);
  }


  /* ==========================================================
     LOGIN
     ========================================================== */

  async function login(event) {

    event.preventDefault();

    setError("");
    setMessage("");

    if (
      !email ||
      !password
    ) {

      setError(
        "Please enter your email and password."
      );

      return;
    }


    const {
      data,
      error:
        loginError,
    } =
      await supabase.auth
        .signInWithPassword({
          email,
          password,
        });


    if (loginError) {

      setError(
        loginError.message
      );

      return;
    }


    setSession(
      data.session
    );

    await loadProfile(
      data.user.id
    );
  }


  /* ==========================================================
     LOGOUT
     ========================================================== */

  async function logout() {

    await supabase.auth.signOut();

    setSession(null);

    setProfile(null);

    setEmail("");

    setPassword("");

    setPage("login");

    setError("");

    setMessage("");
  }


  /* ==========================================================
     LOADING SCREEN
     ========================================================== */

  if (loading) {

    return (
      <div className="app">

        <div className="card">

          <h1>
            HOMEWORK DIARY
          </h1>

          <p>
            Loading...
          </p>

        </div>

      </div>
    );
  }


  /* ==========================================================
     NOT LOGGED IN
     ========================================================== */

  if (!session) {

    if (
      page === "register"
    ) {

      return (
        <RegisterPage
          onBack={() => {

            setPage("login");

            setError("");

            setMessage("");

          }}
        />
      );
    }


    return (
      <LoginPage
        email={email}
        password={password}
        setEmail={setEmail}
        setPassword={setPassword}
        login={login}
        onRegister={() => {

          setPage(
            "register"
          );

          setError("");

          setMessage("");

        }}
        error={error}
        message={message}
      />
    );
  }


  /* ==========================================================
     LOGGED IN BUT PROFILE NOT FOUND
     ========================================================== */

  if (!profile) {

    return (
      <div className="app">

        <div className="card">

          <h1>
            HOMEWORK DIARY
          </h1>

          <p>
            Your account is signed in,
            but your profile record could
            not be found.
          </p>

          <button
            onClick={logout}
          >
            Logout
          </button>

        </div>

      </div>
    );
  }


  /* ==========================================================
     TEACHER
     ========================================================== */

  if (
    profile.role ===
    "Teacher"
  ) {

    return (
      <TeacherDashboard
        profile={profile}
        onLogout={logout}
      />
    );
  }


  /* ==========================================================
     STUDENT
     ========================================================== */

  return (
    <StudentDashboard
      profile={profile}
      onLogout={logout}
    />
  );
}


/* ============================================================
   LOGIN PAGE
   ============================================================ */

function LoginPage({
  email,
  password,
  setEmail,
  setPassword,
  login,
  onRegister,
  error,
  message,
}) {

  return (
    <div className="app">

      <div className="card login-card">

        <h1>
          HOMEWORK DIARY
        </h1>

        <h2>
          Login
        </h2>

        <p className="subtitle">
          Enter your email and password.
        </p>


        {error && (
          <div className="error">
            {error}
          </div>
        )}


        {message && (
          <div className="success">
            {message}
          </div>
        )}


        <form
          onSubmit={login}
        >

          <label>
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value
              )
            }
            placeholder="Enter your email"
            autoComplete="email"
          />


          <label>
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value
              )
            }
            placeholder="Enter your password"
            autoComplete="current-password"
          />


          <button
            type="submit"
          >
            Login
          </button>

        </form>


        <div className="divider">
          OR
        </div>


        <button
          className="secondary-button"
          onClick={onRegister}
        >
          Create New Account
        </button>

      </div>

    </div>
  );
}


/* ============================================================
   REGISTER PAGE
   ============================================================ */

function RegisterPage({
  onBack,
}) {

  const [role, setRole] =
    useState("Student");

  const [fullName, setFullName] =
    useState("");

  const [fatherName, setFatherName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [age, setAge] =
    useState("");

  const [gender, setGender] =
    useState("");

  const [
    institutionType,
    setInstitutionType,
  ] =
    useState(
      "Primary School"
    );

  const [
    institutionName,
    setInstitutionName,
  ] =
    useState("");

  const [className, setClassName] =
    useState("");

  const [section, setSection] =
    useState("");

  const [groupName, setGroupName] =
    useState("");

  const [rollNumber, setRollNumber] =
    useState("");

  const [photo, setPhoto] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");


  const needsGroup =
    institutionType ===
      "High School" ||
    institutionType ===
      "College";


  /* ==========================================================
     REGISTER
     ========================================================== */

  async function register(event) {

    event.preventDefault();

    setError("");

    setMessage("");


    /* --------------------------------------------------------
       VALIDATION
       -------------------------------------------------------- */

    if (
      !fullName.trim()
    ) {

      setError(
        "Please enter your full name."
      );

      return;
    }


    if (
      role === "Student" &&
      !fatherName.trim()
    ) {

      setError(
        "Please enter your father name."
      );

      return;
    }


    if (
      !email.trim()
    ) {

      setError(
        "Please enter your email."
      );

      return;
    }


    if (
      password.length < 6
    ) {

      setError(
        "Password must contain at least 6 characters."
      );

      return;
    }


    if (
      !institutionName.trim()
    ) {

      setError(
        "Please enter your institution name."
      );

      return;
    }


    if (
      !className.trim()
    ) {

      setError(
        "Please enter your class."
      );

      return;
    }


    if (
      !section.trim()
    ) {

      setError(
        "Please enter your section."
      );

      return;
    }


    if (
      needsGroup &&
      !groupName.trim()
    ) {

      setError(
        "Please enter your group."
      );

      return;
    }


    if (
      role === "Student" &&
      !rollNumber.trim()
    ) {

      setError(
        "Please enter your roll number."
      );

      return;
    }


    setLoading(true);


    try {

      /* ------------------------------------------------------
         CREATE AUTH ACCOUNT
         ------------------------------------------------------ */

      const {
        data,
        error:
          signUpError,
      } =
        await supabase.auth
          .signUp({
            email:
              email.trim(),
            password,
          });


      if (signUpError) {
        throw signUpError;
      }


      if (!data.user) {

        throw new Error(
          "Account could not be created."
        );
      }


      /* ------------------------------------------------------
         UPLOAD PHOTO
         ------------------------------------------------------ */

      let photoUrl = null;


      if (photo) {

        const fileExtension =
          photo.name
            .split(".")
            .pop() ||
          "jpg";


        const filePath =
          `${data.user.id}/profile.${fileExtension}`;


        const {
          error:
            uploadError,
        } =
          await supabase
            .storage
            .from(
              "profile-photos"
            )
            .upload(
              filePath,
              photo,
              {
                upsert: true,
                contentType:
                  photo.type,
              }
            );


        if (uploadError) {
          throw uploadError;
        }


        const {
          data:
            publicData,
        } =
          supabase.storage
            .from(
              "profile-photos"
            )
            .getPublicUrl(
              filePath
            );


        photoUrl =
          publicData.publicUrl;
      }


      /* ------------------------------------------------------
         CREATE PROFILE
         ------------------------------------------------------ */

      const profileData = {

        /* VERY IMPORTANT:
           This MUST be the same ID as Auth user.
        */

        id:
          data.user.id,


        full_name:
          fullName.trim(),


        father_name:
          role === "Student"
            ? fatherName.trim()
            : null,


        email:
          email.trim(),


        age:
          age
            ? Number(age)
            : null,


        gender:
          gender || null,


        role,


        institution_type:
          institutionType,


        institution_name:
          institutionName.trim(),


        class_name:
          className.trim(),


        section:
          section.trim(),


        group_name:
          needsGroup
            ? groupName.trim()
            : null,


        roll_number:
          role === "Student"
            ? rollNumber.trim()
            : null,


        photo_url:
          photoUrl,
      };


      const {
        error:
          profileError,
      } =
        await supabase
          .from("profiles")
          .insert(
            profileData
          );


      if (profileError) {
        throw profileError;
      }


      /* ------------------------------------------------------
         SUCCESS
         ------------------------------------------------------ */

      setMessage(
        "Account created successfully. Please check your email if email confirmation is enabled, then log in."
      );

      setLoading(false);

    } catch (err) {

      console.error(
        "Registration error:",
        err
      );

      setError(
        err.message ||
          "Registration failed."
      );

      setLoading(false);
    }
  }


  /* ==========================================================
     REGISTER UI
     ========================================================== */

  return (
    <div className="app">

      <div className="card register-card">

        <h1>
          HOMEWORK DIARY
        </h1>

        <h2>
          Create New Account
        </h2>


        {error && (
          <div className="error">
            {error}
          </div>
        )}


        {message && (
          <div className="success">
            {message}
          </div>
        )}


        <form
          onSubmit={register}
        >

          {/* ROLE */}

          <label>
            Role
          </label>

          <select
            value={role}
            onChange={(event) =>
              setRole(
                event.target.value
              )
            }
          >

            <option value="Student">
              Student
            </option>

            <option value="Teacher">
              Teacher
            </option>

          </select>


          {/* FULL NAME */}

          <label>
            Full Name
          </label>

          <input
            value={fullName}
            onChange={(event) =>
              setFullName(
                event.target.value
              )
            }
            placeholder="Full name"
          />


          {/* FATHER NAME */}

          {role ===
            "Student" && (
            <>
              <label>
                Father Name
              </label>

              <input
                value={fatherName}
                onChange={(event) =>
                  setFatherName(
                    event.target.value
                  )
                }
                placeholder="Father name"
              />
            </>
          )}


          {/* EMAIL */}

          <label>
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value
              )
            }
            placeholder="Email address"
          />


          {/* PASSWORD */}

          <label>
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value
              )
            }
            placeholder="At least 6 characters"
          />


          {/* AGE */}

          <label>
            Age
          </label>

          <input
            type="number"
            min="1"
            max="120"
            value={age}
            onChange={(event) =>
              setAge(
                event.target.value
              )
            }
            placeholder="Age"
          />


          {/* GENDER */}

          <label>
            Gender
          </label>

          <select
            value={gender}
            onChange={(event) =>
              setGender(
                event.target.value
              )
            }
          >

            <option value="">
              Select gender
            </option>

            <option value="Male">
              Male
            </option>

            <option value="Female">
              Female
            </option>

            <option value="Other">
              Other
            </option>

          </select>


          {/* INSTITUTION TYPE */}

          <label>
            Institution Type
          </label>

          <select
            value={
              institutionType
            }
            onChange={(event) =>
              setInstitutionType(
                event.target.value
              )
            }
          >

            <option value="Primary School">
              Primary School
            </option>

            <option value="Secondary School">
              Secondary School
            </option>

            <option value="High School">
              High School
            </option>

            <option value="College">
              College
            </option>

          </select>


          {/* INSTITUTION */}

          <label>
            Institution Name
          </label>

          <input
            value={
              institutionName
            }
            onChange={(event) =>
              setInstitutionName(
                event.target.value
              )
            }
            placeholder="School or college name"
          />


          {/* CLASS */}

          <label>
            Class
          </label>

          <input
            value={className}
            onChange={(event) =>
              setClassName(
                event.target.value
              )
            }
            placeholder="Class"
          />


          {/* SECTION */}

          <label>
            Section
          </label>

          <input
            value={section}
            onChange={(event) =>
              setSection(
                event.target.value
              )
            }
            placeholder="Section"
          />


          {/* GROUP */}

          {needsGroup && (
            <>
              <label>
                Group
              </label>

              <input
                value={groupName}
                onChange={(event) =>
                  setGroupName(
                    event.target.value
                  )
                }
                placeholder="Group"
              />
            </>
          )}


          {/* ROLL NUMBER */}

          {role ===
            "Student" && (
            <>
              <label>
                Roll Number
              </label>

              <input
                value={
                  rollNumber
                }
                onChange={(event) =>
                  setRollNumber(
                    event.target.value
                  )
                }
                placeholder="Roll number"
              />
            </>
          )}


          {/* PHOTO */}

          <label>
            Profile Photo
          </label>

          <input
            type="file"
            accept="image/*"
            onChange={(event) =>
              setPhoto(
                event.target.files?.[0] ||
                  null
              )
            }
          />


          {/* CREATE ACCOUNT */}

          <button
            type="submit"
            disabled={loading}
          >

            {loading
              ? "Creating Account..."
              : "Create Account"}

          </button>

        </form>


        <button
          className="secondary-button"
          onClick={onBack}
        >
          Back to Login
        </button>

      </div>

    </div>
  );
}


/* ============================================================
   PROFILE CARD
   ============================================================ */

function ProfileCard({
  profile,
}) {

  return (
    <div className="profile-card">

      <div className="profile-photo-container">

        {profile.photo_url ? (

          <img
            src={
              profile.photo_url
            }
            alt="Profile"
            className="profile-photo"
          />

        ) : (

          <div className="profile-placeholder">
            No Photo
          </div>

        )}

      </div>


      <div className="profile-information">

        <h3>
          Profile
        </h3>


        <p>
          <strong>
            Full Name:
          </strong>{" "}
          {profile.full_name}
        </p>


        {profile.father_name && (
          <p>
            <strong>
              Father Name:
            </strong>{" "}
            {profile.father_name}
          </p>
        )}


        <p>
          <strong>
            Email:
          </strong>{" "}
          {profile.email}
        </p>


        {profile.age && (
          <p>
            <strong>
              Age:
            </strong>{" "}
            {profile.age}
          </p>
        )}


        {profile.gender && (
          <p>
            <strong>
              Gender:
            </strong>{" "}
            {profile.gender}
          </p>
        )}


        <p>
          <strong>
            Role:
          </strong>{" "}
          {profile.role}
        </p>


        <p>
          <strong>
            Institution:
          </strong>{" "}
          {profile.institution_name}
        </p>


        <p>
          <strong>
            Institution Type:
          </strong>{" "}
          {profile.institution_type}
        </p>


        <p>
          <strong>
            Class:
          </strong>{" "}
          {profile.class_name}
        </p>


        <p>
          <strong>
            Section:
          </strong>{" "}
          {profile.section}
        </p>


        {profile.group_name && (
          <p>
            <strong>
              Group:
            </strong>{" "}
            {profile.group_name}
          </p>
        )}


        {profile.roll_number && (
          <p>
            <strong>
              Roll Number:
            </strong>{" "}
            {profile.roll_number}
          </p>
        )}

      </div>

    </div>
  );
}


/* ============================================================
   TEACHER DASHBOARD
   ============================================================ */

function TeacherDashboard({
  profile,
  onLogout,
}) {

  const [subject, setSubject] =
    useState("");

  const [homeworkText, setHomeworkText] =
    useState("");

  const [dueDate, setDueDate] =
    useState("");

  const [recipientType, setRecipientType] =
    useState("class");

  const [students, setStudents] =
    useState([]);

  const [selectedStudent, setSelectedStudent] =
    useState("");

  const [homeworkList, setHomeworkList] =
    useState([]);

  const [completionList, setCompletionList] =
    useState([]);

  const [studentProfiles, setStudentProfiles] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");


  /* ==========================================================
     LOAD TEACHER DATA
     ========================================================== */

  useEffect(() => {

    loadStudents();

    loadTeacherHomework();

  }, []);


  /* ==========================================================
     LOAD MATCHING STUDENTS
     ========================================================== */

  async function loadStudents() {

    const {
      data,
      error:
        studentsError,
    } =
      await supabase
        .from("profiles")
        .select("*")
        .eq(
          "role",
          "Student"
        )
        .eq(
          "institution_name",
          profile.institution_name
        )
        .eq(
          "class_name",
          profile.class_name
        )
        .eq(
          "section",
          profile.section
        );


    if (studentsError) {

      console.error(
        "Student loading error:",
        studentsError
      );

      setError(
        "Could not load students: " +
          studentsError.message
      );

      return;
    }


    const matchingStudents =
      (data || []).filter(
        (student) => {

          return (
            student.group_name ===
            profile.group_name
          );

        }
      );


    setStudents(
      matchingStudents
    );
  }


  /* ==========================================================
     LOAD TEACHER HOMEWORK
     ========================================================== */

  async function loadTeacherHomework() {

    const {
      data,
      error:
        homeworkError,
    } =
      await supabase
        .from("homework")
        .select("*")
        .eq(
          "teacher_id",
          profile.id
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );


    if (homeworkError) {

      console.error(
        "Homework loading error:",
        homeworkError
      );

      setError(
        "Could not load homework: " +
          homeworkError.message
      );

      return;
    }


    const homeworkData =
      data || [];


    setHomeworkList(
      homeworkData
    );


    await loadCompletions(
      homeworkData
    );
  }


  /* ==========================================================
     LOAD COMPLETED HOMEWORK
     ========================================================== */

  async function loadCompletions(
    teacherHomework
  ) {

    if (
      !teacherHomework ||
      teacherHomework.length === 0
    ) {

      setCompletionList([]);

      setStudentProfiles([]);

      return;
    }


    const homeworkIds =
      teacherHomework.map(
        (item) =>
          item.id
      );


    const {
      data:
        completionData,
      error:
        completionError,
    } =
      await supabase
        .from(
          "homework_completions"
        )
        .select("*")
        .in(
          "homework_id",
          homeworkIds
        )
        .order(
          "id",
          {
            ascending: false,
          }
        );


    if (completionError) {

      console.error(
        "Completion loading error:",
        completionError
      );

      setError(
        "Could not load finished homework: " +
          completionError.message
      );

      return;
    }


    const completions =
      completionData || [];


    setCompletionList(
      completions
    );


    const studentIds = [
      ...new Set(
        completions
          .map(
            (item) =>
              item.student_id
          )
          .filter(Boolean)
      ),
    ];


    if (
      studentIds.length ===
      0
    ) {

      setStudentProfiles([]);

      return;
    }


    const {
      data:
        profileData,
      error:
        profileError,
    } =
      await supabase
        .from("profiles")
        .select(
          `
            id,
            full_name,
            roll_number,
            institution_name,
            class_name,
            section,
            group_name
          `
        )
        .in(
          "id",
          studentIds
        );


    if (profileError) {

      console.error(
        "Student profile loading error:",
        profileError
      );

      setError(
        "Could not load student information: " +
          profileError.message
      );

      return;
    }


    setStudentProfiles(
      profileData || []
    );
  }


  /* ==========================================================
     SEND HOMEWORK
     ========================================================== */

  async function sendHomework(
    event
  ) {

    event.preventDefault();

    setError("");

    setMessage("");


    if (
      !subject.trim()
    ) {

      setError(
        "Enter the subject."
      );

      return;
    }


    if (
      !homeworkText.trim()
    ) {

      setError(
        "Enter the homework."
      );

      return;
    }


    if (
      recipientType ===
        "student" &&
      !selectedStudent
    ) {

      setError(
        "Select a student."
      );

      return;
    }


    const selectedProfile =
      students.find(
        (student) =>
          student.id ===
          selectedStudent
      );


    if (
      recipientType ===
        "student" &&
      !selectedProfile
    ) {

      setError(
        "The selected student is not available."
      );

      return;
    }


    setLoading(true);


    const homeworkData = {

      teacher_id:
        profile.id,

      subject:
        subject.trim(),

      homework_text:
        homeworkText.trim(),

      due_date:
        dueDate || null,

      recipient_type:
        recipientType,

      recipient_student_id:
        recipientType ===
        "student"
          ? selectedStudent
          : null,

      recipient_institution_name:
        profile.institution_name,

      recipient_class_name:
        profile.class_name,

      recipient_section:
        profile.section,

      recipient_group_name:
        recipientType ===
        "student"
          ? selectedProfile
              ?.group_name ||
            null
          : profile.group_name ||
            null,
    };


    const {
      error:
        insertError,
    } =
      await supabase
        .from("homework")
        .insert(
          homeworkData
        );


    if (insertError) {

      console.error(
        "Homework insert error:",
        insertError
      );

      setLoading(false);

      setError(
        insertError.message
      );

      return;
    }


    setSubject("");

    setHomeworkText("");

    setDueDate("");

    setSelectedStudent("");


    setMessage(
      "Homework sent successfully."
    );


    setLoading(false);


    await loadTeacherHomework();
  }


  /* ==========================================================
     FIND STUDENT
     ========================================================== */

  function getStudentForCompletion(
    completion
  ) {

    return studentProfiles.find(
      (student) =>
        student.id ===
        completion.student_id
    );
  }


  /* ==========================================================
     FIND HOMEWORK
     ========================================================== */

  function getHomeworkForCompletion(
    completion
  ) {

    return homeworkList.find(
      (homework) =>
        homework.id ===
        completion.homework_id
    );
  }


  /* ==========================================================
     TEACHER UI
     ========================================================== */

  return (
    <div className="app">

      <div className="dashboard">


        {/* ==================================================
            TOP BAR
            ================================================== */}

        <div className="topbar">

          <h1>
            TEACHER HOMEWORK DIARY
          </h1>

          <button
            onClick={onLogout}
          >
            Logout
          </button>

        </div>


        {/* ==================================================
            PROFILE
            ================================================== */}

        <ProfileCard
          profile={profile}
        />


        {/* ==================================================
            SEND HOMEWORK
            ================================================== */}

        <div className="dashboard-card">

          <h2>
            Send Homework
          </h2>


          {error && (
            <div className="error">
              {error}
            </div>
          )}


          {message && (
            <div className="success">
              {message}
            </div>
          )}


          <form
            onSubmit={
              sendHomework
            }
          >


            {/* SUBJECT */}

            <label>
              Subject
            </label>

            <input
              value={subject}
              onChange={(event) =>
                setSubject(
                  event.target.value
                )
              }
              placeholder="Subject name"
            />


            {/* HOMEWORK */}

            <label>
              Homework
            </label>

            <textarea
              value={
                homeworkText
              }
              onChange={(event) =>
                setHomeworkText(
                  event.target.value
                )
              }
              placeholder="Write homework here..."
              rows="6"
            />


            {/* DUE DATE */}

            <label>
              Due Date
            </label>

            <input
              type="date"
              value={dueDate}
              onChange={(event) =>
                setDueDate(
                  event.target.value
                )
              }
            />


            {/* SEND TO */}

            <label>
              Send To
            </label>

            <select
              value={
                recipientType
              }
              onChange={(event) =>
                setRecipientType(
                  event.target.value
                )
              }
            >

              <option value="class">
                Entire Matching Class
              </option>

              <option value="student">
                Specific Student
              </option>

            </select>


            {/* SPECIFIC STUDENT */}

            {recipientType ===
              "student" && (
              <>

                <label>
                  Select Student
                </label>


                {students.length ===
                0 ? (

                  <p>
                    No matching students found.
                  </p>

                ) : (

                  <select
                    value={
                      selectedStudent
                    }
                    onChange={(
                      event
                    ) =>
                      setSelectedStudent(
                        event.target.value
                      )
                    }
                  >

                    <option value="">
                      Select student
                    </option>


                    {students.map(
                      (student) => (

                        <option
                          key={
                            student.id
                          }
                          value={
                            student.id
                          }
                        >

                          {
                            student.full_name
                          }

                          {" - "}

                          {
                            student.roll_number ||
                            "No roll number"
                          }

                        </option>

                      )
                    )}

                  </select>

                )}

              </>
            )}


            {/* SEND */}

            <button
              type="submit"
              disabled={loading}
            >

              {loading
                ? "Sending..."
                : "Send Homework"}

            </button>

          </form>

        </div>


        {/* ==================================================
            SENT HOMEWORK
            ================================================== */}

        <div className="dashboard-card">

          <h2>
            Sent Homework
          </h2>


          {homeworkList.length ===
          0 ? (

            <p>
              No homework sent yet.
            </p>

          ) : (

            homeworkList.map(
              (homework) => (

                <div
                  className="homework-item"
                  key={
                    homework.id
                  }
                >

                  <h3>
                    {
                      homework.subject
                    }
                  </h3>


                  <p>
                    {
                      homework.homework_text
                    }
                  </p>


                  <p>

                    <strong>
                      Sent:
                    </strong>{" "}

                    {new Date(
                      homework.created_at
                    ).toLocaleString()}

                  </p>


                  {homework.due_date && (
                    <p>

                      <strong>
                        Due:
                      </strong>{" "}

                      {
                        homework.due_date
                      }

                    </p>
                  )}


                  <p>

                    <strong>
                      Recipient:
                    </strong>{" "}

                    {
                      homework.recipient_type ===
                      "class"
                        ? "Entire Matching Class"
                        : "Specific Student"
                    }

                  </p>


                  {homework.recipient_type ===
                    "student" && (

                    <p>

                      <strong>
                        Student:
                      </strong>{" "}

                      {
                        students.find(
                          (student) =>
                            student.id ===
                            homework.recipient_student_id
                        )?.full_name ||
                        "Specific student"
                      }

                    </p>

                  )}

                </div>

              )
            )

          )}

        </div>


        {/* ==================================================
            FINISHED HOMEWORK
            ================================================== */}

        <div className="dashboard-card">

          <h2>
            Finished Homework
          </h2>


          {completionList.length ===
          0 ? (

            <p>
              No student has finished homework yet.
            </p>

          ) : (

            completionList.map(
              (completion) => {

                const homework =
                  getHomeworkForCompletion(
                    completion
                  );


                const student =
                  getStudentForCompletion(
                    completion
                  );


                if (!homework) {
                  return null;
                }


                return (

                  <div
                    className="homework-item"
                    key={
                      completion.id
                    }
                  >

                    <h3>
                      {
                        homework.subject
                      }
                    </h3>


                    <p>

                      <strong>
                        Student:
                      </strong>{" "}

                      {
                        student?.full_name ||
                        "Unknown Student"
                      }

                    </p>


                    {student?.roll_number && (
                      <p>

                        <strong>
                          Roll Number:
                        </strong>{" "}

                        {
                          student.roll_number
                        }

                      </p>
                    )}


                    <p>

                      <strong>
                        Homework:
                      </strong>{" "}

                      {
                        homework.homework_text
                      }

                    </p>


                    {homework.due_date && (
                      <p>

                        <strong>
                          Due:
                        </strong>{" "}

                        {
                          homework.due_date
                        }

                      </p>
                    )}


                    <p>

                      <strong>
                        Status:
                      </strong>{" "}

                      Finished

                    </p>


                    {completion.completed_at && (
                      <p>

                        <strong>
                          Finished At:
                        </strong>{" "}

                        {new Date(
                          completion.completed_at
                        ).toLocaleString()}

                      </p>
                    )}

                  </div>

                );
              }
            )

          )}

        </div>


      </div>

    </div>
  );
}


/* ============================================================
   STUDENT DASHBOARD
   ============================================================ */

function StudentDashboard({
  profile,
  onLogout,
}) {

  const [homework, setHomework] =
    useState([]);

  const [history, setHistory] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");


  /* ==========================================================
     LOAD STUDENT HOMEWORK
     ========================================================== */

  useEffect(() => {

    loadHomework();

  }, []);


  /* ==========================================================
     LOAD HOMEWORK
     ========================================================== */

  async function loadHomework() {

    setLoading(true);

    setError("");


    /* --------------------------------------------------------
       LOAD HOMEWORK
       -------------------------------------------------------- */

    const {
      data:
        homeworkData,
      error:
        homeworkError,
    } =
      await supabase
        .from("homework")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false,
          }
        );


    if (homeworkError) {

      setError(
        homeworkError.message
      );

      setLoading(false);

      return;
    }


    /* --------------------------------------------------------
       LOAD COMPLETIONS
       -------------------------------------------------------- */

    const {
      data:
        completionData,
      error:
        completionError,
    } =
      await supabase
        .from(
          "homework_completions"
        )
        .select("*")
        .eq(
          "student_id",
          profile.id
        );


    if (completionError) {

      setError(
        completionError.message
      );

      setLoading(false);

      return;
    }


    const completedIds =
      new Set(
        (completionData || [])
          .map(
            (item) =>
              item.homework_id
          )
      );


    /* --------------------------------------------------------
       FILTER HOMEWORK FOR THIS STUDENT

       Matching:
       Institution
       Class
       Section
       Group

       OR specific student.
       -------------------------------------------------------- */

    const matchingHomework =
      (homeworkData || []).filter(
        (item) => {

          /* Specific student */

          if (
            item.recipient_type ===
            "student"
          ) {

            return (
              item.recipient_student_id ===
              profile.id
            );
          }


          /* Entire matching class */

          const institutionMatches =
            item.recipient_institution_name ===
            profile.institution_name;


          const classMatches =
            item.recipient_class_name ===
            profile.class_name;


          const sectionMatches =
            item.recipient_section ===
            profile.section;


          const groupMatches =
            item.recipient_group_name ===
            profile.group_name;


          return (
            institutionMatches &&
            classMatches &&
            sectionMatches &&
            groupMatches
          );
        }
      );


    /* --------------------------------------------------------
       SEPARATE ACTIVE AND HISTORY
       -------------------------------------------------------- */

    const activeHomework = [];

    const historyHomework = [];


    matchingHomework.forEach(
      (item) => {

        if (
          completedIds.has(
            item.id
          )
        ) {

          historyHomework.push(
            item
          );

        } else {

          activeHomework.push(
            item
          );

        }

      }
    );


    setHomework(
      activeHomework
    );


    setHistory(
      historyHomework
    );


    setLoading(false);
  }


  /* ==========================================================
     FINISH HOMEWORK
     ========================================================== */

  async function finishHomework(
    homeworkId
  ) {

    setError("");

    setMessage("");


    const {
      error:
        completionError,
    } =
      await supabase
        .from(
          "homework_completions"
        )
        .insert({
          homework_id:
            homeworkId,

          student_id:
            profile.id,
        });


    if (completionError) {

      if (
        completionError.code ===
        "23505"
      ) {

        setMessage(
          "This homework is already finished."
        );

      } else {

        setError(
          completionError.message
        );

      }

      return;
    }


    setMessage(
      "Homework marked as finished."
    );


    await loadHomework();
  }


  /* ==========================================================
     STUDENT UI
     ========================================================== */

  return (
    <div className="app">

      <div className="dashboard">


        {/* ==================================================
            TOP BAR
            ================================================== */}

        <div className="topbar">

          <h1>
            STUDENT HOMEWORK DIARY
          </h1>

          <button
            onClick={onLogout}
          >
            Logout
          </button>

        </div>


        {/* ==================================================
            PROFILE
            ================================================== */}

        <ProfileCard
          profile={profile}
        />


        {/* ==================================================
            MESSAGES
            ================================================== */}

        {error && (
          <div className="error">
            {error}
          </div>
        )}


        {message && (
          <div className="success">
            {message}
          </div>
        )}


        {/* ==================================================
            MY HOMEWORK
            ================================================== */}

        <div className="dashboard-card">

          <h2>
            My Homework
          </h2>


          {loading ? (

            <p>
              Loading homework...
            </p>

          ) : homework.length ===
            0 ? (

            <p>
              No new homework.
            </p>

          ) : (

            homework.map(
              (item) => (

                <div
                  className="homework-item"
                  key={
                    item.id
                  }
                >

                  <h3>
                    {
                      item.subject
                    }
                  </h3>


                  <p>
                    {
                      item.homework_text
                    }
                  </p>


                  {item.due_date && (
                    <p>

                      <strong>
                        Due:
                      </strong>{" "}

                      {
                        item.due_date
                      }

                    </p>
                  )}


                  <p>

                    <strong>
                      Received:
                    </strong>{" "}

                    {new Date(
                      item.created_at
                    ).toLocaleString()}

                  </p>


                  <button
                    onClick={() =>
                      finishHomework(
                        item.id
                      )
                    }
                  >
                    Finished
                  </button>

                </div>

              )
            )

          )}

        </div>


        {/* ==================================================
            HISTORY HOMEWORK
            ================================================== */}

        <div className="dashboard-card">

          <h2>
            History Homework
          </h2>


          {history.length ===
          0 ? (

            <p>
              No finished homework yet.
            </p>

          ) : (

            history.map(
              (item) => (

                <div
                  className="homework-item history-item"
                  key={
                    item.id
                  }
                >

                  <h3>
                    {
                      item.subject
                    }
                  </h3>


                  <p>
                    {
                      item.homework_text
                    }
                  </p>


                  {item.due_date && (
                    <p>

                      <strong>
                        Due:
                      </strong>{" "}

                      {
                        item.due_date
                      }

                    </p>
                  )}


                  <p>

                    <strong>
                      Status:
                    </strong>{" "}

                    Finished

                  </p>

                </div>

              )
            )

          )}

        </div>


      </div>

    </div>
  );
}


/* ============================================================
   EXPORT
   ============================================================ */

export default App;