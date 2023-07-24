import React, { useState } from "react";

const Page = () => {
  const [formData, setFormData] = useState({
    date: "",
    vendorName: "",
    csvFile: null,
  });
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData({
      ...formData,
      [name]: name === "csvFile" ? files[0] : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    const formDataToSend = new FormData();
    formDataToSend.append("date", formData.date);
    formDataToSend.append("vendorName", formData.vendorName);
    formDataToSend.append("csvFile", formData.csvFile);

    try {
      const response = await fetch(
        "http://localhost:3001/api/submitpurchaseorder",
        {
          method: "POST",
          body: formDataToSend,
        }
      );
      const data = await response.json();
      if (data.success) {
        setSuccessMessage("Purchase order successfully submitted.");
      } else {
        setErrorMessage(data.error);
      }
    } catch (error) {
      setErrorMessage("An error occurred. Please try again later.");
    }
  };

  return (
    <div>
      <h1>Submit Purchase Order</h1>
      {successMessage && <div className="success">{successMessage}</div>}
      {errorMessage && <div className="error">{errorMessage}</div>}
      <form onSubmit={handleSubmit}>
        <label>
          Date:
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Vendor Name:
          <input
            type="text"
            name="vendorName"
            value={formData.vendorName}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          CSV File:
          <input
            type="file"
            name="csvFile"
            onChange={handleChange}
            accept=".csv"
            required
          />
        </label>
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default Page;
