import { useEffect, useState } from "react";
import api from "../../services/api";

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-blue-900";

export default function OwnerProfile() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const response = await api.get("/auth/me");

        if (mounted) {
          setForm({
            name: response.data.user.name || "",
            email: response.data.user.email || "",
            phone: response.data.user.phone || "",
          });
        }
      } catch (err) {
        if (mounted) {
          setError(
            err.response?.data?.message || "Unable to load your profile.",
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  function handleChange(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
    setError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();

    if (!name || !email || !phone) {
      setError("Please fill in all fields.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!/^\d{10,15}$/.test(phone)) {
      setError("Phone must contain 10 to 15 digits.");
      return;
    }

    setSaving(true);

    try {
      const response = await api.patch("/auth/me", {
        name,
        email,
        phone,
      });

      const updatedUser = response.data.user;

      setForm({
        name: updatedUser.name || "",
        email: updatedUser.email || "",
        phone: updatedUser.phone || "",
      });

      setSuccess("Your profile has been updated successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save your profile. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl p-6 text-gray-700 dark:text-gray-200">
        Loading your profile...
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          My Profile
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          View and update your personal account information.
        </p>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-8">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            {form.name.trim().charAt(0).toUpperCase() || "O"}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Account Information
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Owner account
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
          >
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="name"
              className="text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              Full Name
            </label>
            <input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              className={inputClass}
              maxLength={100}
              autoComplete="name"
              required
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className={inputClass}
              maxLength={150}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              Phone Number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              className={inputClass}
              maxLength={15}
              autoComplete="tel"
              required
            />
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setError("");
                setSuccess("");
                setLoading(true);

                api
                  .get("/auth/me")
                  .then((response) => {
                    const user = response.data.user;
                    setForm({
                      name: user.name || "",
                      email: user.email || "",
                      phone: user.phone || "",
                    });
                  })
                  .catch((err) => {
                    setError(
                      err.response?.data?.message ||
                        "Unable to reload your profile.",
                    );
                  })
                  .finally(() => setLoading(false));
              }}
              className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Reload Profile
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
