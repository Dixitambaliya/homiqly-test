"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log(formData);
    const res = await axios.post(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/register`,
      formData
    );
    if (res.status === 200) {
      console.log(res);
      router.push("/login");
      return res.data;
    } else {
      console.log("Error");
    }
  };
  return (
    <div>
      <h1>Register</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          placeholder="Name"
          onChange={handleChange}
        ></input>
        <input
          type="email"
          name="email"
          placeholder="Email"
          onChange={handleChange}
        ></input>
        <input
          type="password"
          name="password"
          placeholder="Password"
          onChange={handleChange}
        ></input>
        <button type="submit">Register</button>
      </form>
    </div>
  );
}
