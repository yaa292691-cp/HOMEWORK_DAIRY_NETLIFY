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
  institution_type: "",
  institution_name: FIXED_INSTITUTION_NAME,
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
