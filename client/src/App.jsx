import { useCallback, useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:5000/api";

const categories = ["Electronics", "ID Cards", "Books", "Accessories", "Other"];

const emptyForm = {
  title: "",
  description: "",
  category: "Other",
  location: "",
  type: "Lost",
  contact: "",
};

const emptyClaim = {
  lostItemId: "",
  claimedBy: "",
  claimContact: "",
  claimEvidence: "",
};

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "The request failed.");
  }

  return data;
}

function App() {
  const [items, setItems] = useState([]);
  const [claims, setClaims] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [claim, setClaim] = useState(emptyClaim);
  const [staffInputs, setStaffInputs] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [showStaff, setShowStaff] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadItems = useCallback(async () => {
    const data = await request(`${API}/items`);
    setItems(data);
  }, []);

  const loadClaims = useCallback(async () => {
    const data = await request(`${API}/claims`);
    setClaims(data);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [itemData, claimData] = await Promise.all([
          request(`${API}/items`),
          request(`${API}/claims`),
        ]);

        if (!cancelled) {
          setItems(itemData);
          setClaims(claimData);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function refresh() {
    await Promise.all([loadItems(), loadClaims()]);
  }

  function openReport(type = "Lost") {
    setForm({ ...emptyForm, type });
    setShowForm(true);
    setSelected(null);
    setError("");
  }

  function openDetails(item) {
    setSelected(item);
    setClaim({
      ...emptyClaim,
      lostItemId: item.type === "Lost" ? item._id : "",
    });
    setError("");
  }

  function updateStaffInput(id, field, value) {
    setStaffInputs((previous) => ({
      ...previous,
      [id]: {
        ...(previous[id] || {}),
        [field]: value,
      },
    }));
  }

  async function submitReport(event) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const result = await request(`${API}/items`, {
        method: "POST",
        body: JSON.stringify(form),
      });

      setNotice(result.message);
      setShowForm(false);
      setForm(emptyForm);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitClaim(event) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const body = { ...claim };

      if (!body.lostItemId) {
        delete body.lostItemId;
      }

      const result = await request(`${API}/items/${selected._id}/claim`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      setNotice(result.message);
      setSelected(null);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // One click verifies the claim and then completes the handover.
  async function approveAndComplete(item) {
    const input = staffInputs[item._id] || {};

    if (!input.verifiedBy?.trim()) {
      setError(`Enter staff name or ID for "${item.title}".`);
      return;
    }

    if (!input.staffNotes?.trim()) {
      setError("Enter verification notes before approving the claim.");
      return;
    }

    const confirmed = window.confirm(
      "Have you verified the claimant's ownership evidence AND physically handed over the item? Click OK only if both are complete.",
    );

    if (!confirmed) return;

    setError("");
    setNotice("");
    setBusy(true);

    try {
      // First, verify the claim.
      const approved = await request(`${API}/items/${item._id}/approve-claim`, {
        method: "PATCH",
        body: JSON.stringify({
          verifiedBy: input.verifiedBy.trim(),
          staffNotes: input.staffNotes.trim(),
        }),
      });

      setNotice(approved.message);

      // Then, complete handover.
      const returned = await request(`${API}/items/${item._id}/return`, {
        method: "PATCH",
      });

      // Reload both reports and claim records.
      await refresh();

      setStaffInputs((previous) => {
        const updated = { ...previous };
        delete updated[item._id];
        return updated;
      });

      setNotice(
        `${returned.message} You can now delete the completed report(s).`,
      );
    } catch (err) {
      setError(err.message);
      try {
        await refresh();
      } catch {
        // Keep the original error visible.
      }
    } finally {
      setBusy(false);
    }
  }

  async function deleteReport(item) {
    const completed = ["Returned", "Closed"].includes(item.status);
    const hasLinkedReport = Boolean(item.matchedItemId);

    const prompt =
      completed && hasLinkedReport
        ? `Permanently delete "${item.title}" and its linked completed report?`
        : `Permanently delete the ${item.type} report "${item.title}"?`;

    if (!window.confirm(prompt)) return;

    setError("");
    setBusy(true);

    try {
      const result = await request(`${API}/items/${item._id}`, {
        method: "DELETE",
      });

      setNotice(result.message);
      setSelected(null);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const activeItems = items.filter((item) => item.status === "Active");
  const lostItems = activeItems.filter((item) => item.type === "Lost");
  const foundItems = activeItems.filter((item) => item.type === "Found");

  const pendingClaims = claims.filter(
    (item) => item.status === "Claim Pending",
  );

  const matchedClaims = claims.filter((item) => item.status === "Matched");

  const completedItems = items.filter((item) =>
    ["Returned", "Closed"].includes(item.status),
  );

  return (
    <div className="app">
      <header className="navbar">
        <a className="brand" href="#home">
          <span className="brand-icon">C</span>
          CampusLoop
        </a>

        <nav>
          <a href="#listings">Browse items</a>
          <button className="staff-nav" onClick={() => setShowStaff(true)}>
            Staff claims ({pendingClaims.length})
          </button>
          <button className="primary-button" onClick={() => openReport()}>
            + Report item
          </button>
        </nav>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-content">
            <span className="eyebrow">YOUR CAMPUS. YOUR COMMUNITY.</span>
            <h1>
              Lost something?
              <br />
              <span>Let's find it together.</span>
            </h1>
            <p>
              Report lost belongings, share found items and discover possible
              matches across your campus.
            </p>

            <div className="hero-actions">
              <button
                className="primary-button"
                onClick={() => openReport("Lost")}
              >
                I lost something
              </button>
              <button
                className="secondary-button"
                onClick={() => openReport("Found")}
              >
                I found something
              </button>
            </div>

            <div className="hero-note">✓ Community-powered item recovery</div>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="art-circle">🔎</div>
            <div className="art-card art-card-one">
              <span>🎒</span>
              <div>
                <strong>Lost backpack</strong>
                <small>Possible match</small>
              </div>
            </div>
            <div className="art-card art-card-two">
              <span>🎧</span>
              <div>
                <strong>Found headphones</strong>
                <small>Student reported</small>
              </div>
            </div>
          </div>
        </section>

        {notice && (
          <div className="notice" role="status">
            <span>{notice}</span>
            <button onClick={() => setNotice("")}>×</button>
          </div>
        )}

        {error && (
          <div className="error-message" role="alert">
            <span>{error}</span>
            <button onClick={() => setError("")}>×</button>
          </div>
        )}

        <section className="match-banner">
          <div className="match-icon">✦</div>
          <div>
            <h2>Smart matching</h2>
            <p>
              Suggestions help you find similar reports. No match is required to
              claim a Found item.
            </p>
          </div>
        </section>

        <section className="listings-section" id="listings">
          <div className="section-heading">
            <div>
              <span className="eyebrow">CAMPUS COMMUNITY</span>
              <h2>Item reports</h2>
              <p>Browse active Lost and Found reports.</p>
            </div>
            <button className="secondary-button" onClick={() => openReport()}>
              + Add listing
            </button>
          </div>

          {loading ? (
            <p className="empty-state">Loading reports...</p>
          ) : (
            <>
              <section className="report-group">
                <h3>
                  Lost items <span>{lostItems.length}</span>
                </h3>

                {lostItems.length === 0 ? (
                  <p className="empty-state">No active Lost reports yet.</p>
                ) : (
                  <div className="item-grid">
                    {lostItems.map((item) => (
                      <article className="item-card" key={item._id}>
                        <button
                          className="card-main"
                          onClick={() => openDetails(item)}
                        >
                          <div className="card-top">
                            <span className="type-badge lost-badge">LOST</span>
                            <span className="category-label">
                              {item.category}
                            </span>
                          </div>
                          <h4>{item.title}</h4>
                          <p>{item.description}</p>
                          <div className="card-location">
                            📍 {item.location}
                          </div>
                          <div className="card-footer">View details →</div>
                        </button>

                        {item.possibleMatches?.length > 0 && (
                          <div className="possible-match">
                            <strong>✦ Possible matches</strong>
                            {item.possibleMatches.map((match) => (
                              <button
                                className="match-link"
                                key={match._id}
                                onClick={() => openDetails(match)}
                              >
                                View Found: {match.title} →
                              </button>
                            ))}
                          </div>
                        )}

                        <button
                          className="delete-link"
                          disabled={busy}
                          onClick={() => deleteReport(item)}
                        >
                          Delete this report
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="report-group">
                <h3>
                  Found items <span>{foundItems.length}</span>
                </h3>

                {foundItems.length === 0 ? (
                  <p className="empty-state">No active Found reports yet.</p>
                ) : (
                  <div className="item-grid">
                    {foundItems.map((item) => (
                      <article className="item-card" key={item._id}>
                        <button
                          className="card-main"
                          onClick={() => openDetails(item)}
                        >
                          <div className="card-top">
                            <span className="type-badge found-badge">
                              FOUND
                            </span>
                            <span className="category-label">
                              {item.category}
                            </span>
                          </div>
                          <h4>{item.title}</h4>
                          <p>{item.description}</p>
                          <div className="card-location">
                            📍 {item.location}
                          </div>
                          <div className="card-footer">
                            View details and claim →
                          </div>
                        </button>

                        <button
                          className="delete-link"
                          disabled={busy}
                          onClick={() => deleteReport(item)}
                        >
                          Delete this report
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </section>

        <section className="status-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">TRACKING</span>
              <h2>Recovery progress</h2>
              <p>Track claims and completed reports.</p>
            </div>
          </div>

          <div className="status-grid">
            <div className="status-card">
              <span className="status-number">{pendingClaims.length}</span>
              <strong>Claims pending</strong>
              <p>Waiting for staff verification</p>
            </div>
            <div className="status-card">
              <span className="status-number">{matchedClaims.length}</span>
              <strong>Verified claims</strong>
              <p>Awaiting handover</p>
            </div>
            <div className="status-card">
              <span className="status-number">{completedItems.length}</span>
              <strong>Completed reports</strong>
              <p>Returned or closed</p>
            </div>
          </div>

          {matchedClaims.length > 0 && (
            <div className="completed-list">
              <h3>Verified — awaiting handover</h3>
              {matchedClaims.map((item) => (
                <div className="completed-row" key={item._id}>
                  <div>
                    <strong>{item.title}</strong>
                    <p>Claimant: {item.claimedBy}</p>
                  </div>
                  <button
                    className="primary-button"
                    onClick={() => openDetails(item)}
                  >
                    Handover details
                  </button>
                </div>
              ))}
            </div>
          )}

          {completedItems.length > 0 && (
            <div className="completed-list">
              <h3>Completed reports</h3>
              {completedItems.map((item) => (
                <div className="completed-row" key={item._id}>
                  <div>
                    <strong>{item.title}</strong>
                    <p>
                      {item.type} · {item.status}
                    </p>
                  </div>
                  <button
                    className="danger-button small-button"
                    disabled={busy}
                    onClick={() => deleteReport(item)}
                  >
                    Delete completed report
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer>
        <a className="brand" href="#home">
          <span className="brand-icon">C</span> CampusLoop
        </a>
        <p>Helping campus belongings find their way home.</p>
      </footer>

      {/* LANDSCAPE REPORT FORM */}
      {showForm && (
        <div
          className="modal-overlay"
          onClick={() => !busy && setShowForm(false)}
        >
          <section
            className="modal report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="close-button"
              disabled={busy}
              onClick={() => setShowForm(false)}
            >
              ×
            </button>

            <span className="eyebrow">CAMPUSLOOP REPORT</span>
            <h2 id="report-title">
              {form.type === "Lost"
                ? "Report a lost item"
                : "Report a found item"}
            </h2>
            <p className="report-subtitle">
              {form.type === "Lost"
                ? "Describe your missing item so others can identify it."
                : "Describe the item you found. You are not claiming ownership."}
            </p>

            <form className="form report-form" onSubmit={submitReport}>
              <label>
                Report type
                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm({ ...form, type: event.target.value })
                  }
                >
                  <option value="Lost">Lost item</option>
                  <option value="Found">Found item</option>
                </select>
              </label>

              <label>
                Item name
                <input
                  required
                  value={form.title}
                  placeholder="e.g. Black wallet"
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                />
              </label>

              <label>
                Category
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm({ ...form, category: event.target.value })
                  }
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Location
                <input
                  required
                  value={form.location}
                  placeholder="e.g. College library"
                  onChange={(event) =>
                    setForm({ ...form, location: event.target.value })
                  }
                />
              </label>

              <label className="wide-field">
                Description
                <textarea
                  required
                  rows={2}
                  value={form.description}
                  placeholder="Colour, brand and distinguishing details..."
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                />
              </label>

              <label className="wide-field">
                Reporter contact
                <input
                  required
                  value={form.contact}
                  placeholder="College email or contact"
                  onChange={(event) =>
                    setForm({ ...form, contact: event.target.value })
                  }
                />
              </label>

              <div className="wide-field form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={busy}
                >
                  {busy ? "Submitting..." : "Submit report →"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* ITEM DETAILS AND CLAIM */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <section
            className="modal details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="details-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="close-button" onClick={() => setSelected(null)}>
              ×
            </button>

            <span
              className={`type-badge ${
                selected.type === "Lost" ? "lost-badge" : "found-badge"
              }`}
            >
              {selected.type.toUpperCase()}
            </span>

            <h2 id="details-title">{selected.title}</h2>
            <p className="details-description">{selected.description}</p>

            <div className="details-list">
              <p>
                <strong>Report ID:</strong> {selected._id}
              </p>
              <p>
                <strong>Category:</strong> {selected.category}
              </p>
              <p>
                <strong>Location:</strong> {selected.location}
              </p>
              <p>
                <strong>Reporter contact:</strong> {selected.contact}
              </p>
              <p>
                <strong>Status:</strong> {selected.status}
              </p>
              <p>
                <strong>Created:</strong>{" "}
                {new Date(selected.createdAt).toLocaleString()}
              </p>
              {selected.matchedItemId && (
                <p>
                  <strong>Linked report ID:</strong> {selected.matchedItemId}
                </p>
              )}
            </div>

            {selected.type === "Found" && selected.status === "Active" && (
              <div className="workflow-panel">
                <h3>Claim this found item</h3>
                <p>
                  You can submit a claim even if no matching Lost report exists.
                  Provide evidence that helps staff verify ownership.
                </p>

                <form className="form" onSubmit={submitClaim}>
                  <label>
                    My Lost report (optional)
                    <select
                      value={claim.lostItemId}
                      onChange={(event) =>
                        setClaim({ ...claim, lostItemId: event.target.value })
                      }
                    >
                      <option value="">No matching Lost report</option>
                      {lostItems.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.title} — {item.location}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Your full name
                    <input
                      required
                      value={claim.claimedBy}
                      onChange={(event) =>
                        setClaim({ ...claim, claimedBy: event.target.value })
                      }
                      placeholder="Full name"
                    />
                  </label>

                  <label>
                    Your contact
                    <input
                      required
                      value={claim.claimContact}
                      onChange={(event) =>
                        setClaim({ ...claim, claimContact: event.target.value })
                      }
                      placeholder="College email or phone"
                    />
                  </label>

                  <label>
                    Ownership evidence
                    <textarea
                      required
                      rows={3}
                      value={claim.claimEvidence}
                      onChange={(event) =>
                        setClaim({
                          ...claim,
                          claimEvidence: event.target.value,
                        })
                      }
                      placeholder="Unique details only the owner would know"
                    />
                  </label>

                  <button
                    className="primary-button full-button"
                    type="submit"
                    disabled={busy}
                  >
                    {busy ? "Submitting..." : "Submit claim for verification"}
                  </button>
                </form>
              </div>
            )}

            {selected.status === "Claim Pending" && (
              <div className="workflow-panel">
                <h3>Claim pending verification</h3>
                <p>
                  <strong>Claimant:</strong> {selected.claimedBy}
                </p>
                <p>
                  <strong>Contact:</strong> {selected.claimContact}
                </p>
                <p>
                  <strong>Evidence:</strong> {selected.claimEvidence}
                </p>
                <p>
                  <strong>Linked Lost report:</strong>{" "}
                  {selected.matchedItemId || "No matching report"}
                </p>
                <p>
                  Staff must verify the evidence before completing the return.
                </p>
              </div>
            )}

            {selected.status === "Matched" && (
              <div className="workflow-panel">
                <h3>Claim verified — awaiting handover</h3>
                <p>
                  <strong>Verified by:</strong> {selected.verifiedBy}
                </p>
                <p>
                  Use the Staff claims workspace to complete the handover after
                  the item has been physically returned.
                </p>
              </div>
            )}

            {["Returned", "Closed"].includes(selected.status) && (
              <div className="workflow-panel">
                <h3>Completed report</h3>
                <p>This report is no longer active.</p>
                <button
                  className="danger-button full-button"
                  disabled={busy}
                  onClick={() => deleteReport(selected)}
                >
                  Delete completed report
                  {selected.matchedItemId ? " and linked report" : ""}
                </button>
              </div>
            )}

            {selected.status === "Active" && (
              <button
                className="danger-button full-button delete-details-button"
                disabled={busy}
                onClick={() => deleteReport(selected)}
              >
                Delete this report
              </button>
            )}
          </section>
        </div>
      )}

      {/* STAFF CLAIMS */}
      {showStaff && (
        <div className="modal-overlay" onClick={() => setShowStaff(false)}>
          <section
            className="modal staff-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="close-button"
              onClick={() => setShowStaff(false)}
            >
              ×
            </button>

            <span className="eyebrow">STAFF WORKSPACE</span>
            <h2 id="staff-title">Claim verification</h2>
            <p>
              Review the evidence and verify ownership. Complete the handover
              only after the item has actually been returned.
            </p>

            {pendingClaims.length === 0 ? (
              <p className="empty-state">No claims waiting for verification.</p>
            ) : (
              pendingClaims.map((item) => {
                const input = staffInputs[item._id] || {};

                return (
                  <div className="staff-claim" key={item._id}>
                    <h3>{item.title}</h3>
                    <p>
                      <strong>Claimant:</strong> {item.claimedBy}
                    </p>
                    <p>
                      <strong>Contact:</strong> {item.claimContact}
                    </p>
                    <p>
                      <strong>Evidence:</strong> {item.claimEvidence}
                    </p>
                    <p>
                      <strong>Found report ID:</strong> {item._id}
                    </p>
                    <p>
                      <strong>Lost report ID:</strong>{" "}
                      {item.matchedItemId || "No matching report"}
                    </p>

                    <label>
                      Staff name / ID
                      <input
                        value={input.verifiedBy || ""}
                        onChange={(event) =>
                          updateStaffInput(
                            item._id,
                            "verifiedBy",
                            event.target.value,
                          )
                        }
                        placeholder="Staff name or ID"
                      />
                    </label>

                    <label>
                      Verification notes
                      <textarea
                        rows={2}
                        value={input.staffNotes || ""}
                        onChange={(event) =>
                          updateStaffInput(
                            item._id,
                            "staffNotes",
                            event.target.value,
                          )
                        }
                        placeholder="Evidence checked and verification result"
                      />
                    </label>

                    <button
                      className="primary-button full-button"
                      disabled={busy}
                      onClick={() => approveAndComplete(item)}
                    >
                      {busy ? "Processing..." : "Approve and complete return"}
                    </button>
                  </div>
                );
              })
            )}

            {matchedClaims.length > 0 && (
              <div className="completed-list">
                <h3>Previously verified — awaiting handover</h3>
                {matchedClaims.map((item) => {
                  const input = staffInputs[item._id] || {};

                  return (
                    <div className="staff-claim" key={item._id}>
                      <h3>{item.title}</h3>
                      <p>
                        <strong>Claimant:</strong> {item.claimedBy}
                      </p>
                      <p>
                        <strong>Verified by:</strong> {item.verifiedBy}
                      </p>

                      <label>
                        Staff name / ID
                        <input
                          value={input.verifiedBy || ""}
                          onChange={(event) =>
                            updateStaffInput(
                              item._id,
                              "verifiedBy",
                              event.target.value,
                            )
                          }
                          placeholder="Staff name or ID"
                        />
                      </label>

                      <label>
                        Verification notes
                        <textarea
                          rows={2}
                          value={input.staffNotes || ""}
                          onChange={(event) =>
                            updateStaffInput(
                              item._id,
                              "staffNotes",
                              event.target.value,
                            )
                          }
                          placeholder="Confirm evidence and handover"
                        />
                      </label>

                      <button
                        className="primary-button full-button"
                        disabled={busy}
                        onClick={async () => {
                          if (
                            !window.confirm(
                              "Confirm that the item has now been physically handed over?",
                            )
                          )
                            return;

                          setError("");
                          setBusy(true);

                          try {
                            const result = await request(
                              `${API}/items/${item._id}/return`,
                              { method: "PATCH" },
                            );
                            setNotice(result.message);
                            await refresh();
                          } catch (err) {
                            setError(err.message);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Confirm handover
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
