import React, { useEffect, useMemo, useState } from "react";
import api from "../../../lib/axiosConfig";
import { toast } from "react-toastify";
import Button from "../../../shared/components/Button/Button";
import { FormInput } from "../../../shared/components/Form";

const ServiceCities = () => {
  const [cityInput, setCityInput] = useState("");
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");

  const fetchCities = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/service/getcity");
      // Support either { cities: [] } OR [] directly
      const list = Array.isArray(res.data?.city) ? res.data.city : res.data;
      console.log(res.data.city);
      setCities(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to fetch cities");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = cityInput.trim();
    if (!name) return;

    try {
      setAdding(true);
      await api.post("/api/service/addcity", { serviceCity: name });
      toast.success("City added");
      setCityInput("");
      await fetchCities();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add city");
    } finally {
      setAdding(false);
    }
  };

  useEffect(() => {
    fetchCities();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter((c) =>
      (c.serviceCity || c.city || "").toLowerCase().includes(q)
    );
  }, [cities, query]);

  return (
    <div className="max-w-3xl mx-auto mt-12 p-6 bg-white shadow rounded-lg border border-gray-200">
      <h2 className="text-2xl font-bold mb-1">🏙️ Service Cities</h2>
      <p className="text-sm text-gray-500 mb-6">
        Add a city and manage the list used across the platform.
      </p>

      {/* Add city */}
      <form onSubmit={handleSubmit} className="mb-6">
        <label className="block font-medium text-gray-700 mb-2">
          City Name
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="e.g., Edmonton"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button type="submit" disabled={!cityInput.trim() || adding}>
            {adding ? "Adding..." : "Add City"}
          </Button>
        </div>
      </form>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <p className="text-sm text-gray-600">
          Total:{" "}
          <span className="font-medium text-gray-900">{cities.length}</span>
        </p>
        <input
          type="text"
          placeholder="Search city…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:w-72 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* List / Table */}
      {loading ? (
        <div className="py-10 text-center">
          <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-2 text-gray-500">Loading cities...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center text-gray-500">
          {query ? "No cities match your search." : "No cities found."}
        </div>
      ) : (
        <div className="overflow-x-auto -mx-2 sm:mx-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  City
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filtered.map((c, i) => (
                <tr key={c.city_id || c.id || c.serviceCity + i}>
                  <td className="px-4 py-3 text-sm text-gray-700">{i + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {c.serviceCity || c.city || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ServiceCities;
