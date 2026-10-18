
import { useCallback, useEffect, useState } from "react";
import "./ManagerDocumentVerification.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const documentLabels = {
  AADHAAR: "Aadhaar card",
  PAN: "PAN card",
  SALARY_SLIP: "Salary slip",
  BANK_PASSBOOK: "Bank passbook",
  PROPERTY_DOCUMENT: "Property document",
  GOLD_DOCUMENT: "Gold document",
  IDENTITY_PROOF: "Identity proof",
  ADDRESS_PROOF: "Address proof",
  OTHER: "Other document",
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const readable = (value) => String(value || "UNKNOWN").replaceAll("_", " ");

const statusClass = (value = "PENDING") =>
  String(value).toLowerCase().replaceAll("_", "-");

async function readResponse(response) {
  const body = await response.json().catch(() => ({}));

  if (response.status === 401 || response.status === 403) {
    window.location.assign("/login");
    throw new Error(
      response.status === 401
        ? "Your session has expired."
        : "You do not have permission to perform this action."
    );
  }

  if (!response.ok) {
    throw new Error(body.message || "The request could not be completed.");
  }

  return body;
}

export default function ManagerDocumentVerification() {
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [documents, setDocuments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [applicationDocuments, setApplicationDocuments] = useState([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const query = new URLSearchParams({
        status: statusFilter,
        page: "1",
        limit: "100",
      });

      const response = await fetch(
        `${API}/documents/review?${query.toString()}`,
        { credentials: "include" }
      );

      const body = await readResponse(response);
      setDocuments(Array.isArray(body.documents) ? body.documents : []);
    } catch (err) {
      setError(err.message || "Unable to load document verification queue.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const openDocument = async (document) => {
    setSelected(document);
    setNotes("");
    setApplicationDocuments([]);
    setError("");
    setNotice("");

    const applicationId =
      document.application?._id || document.application;

    if (!applicationId) {
      setError("The linked loan application could not be identified.");
      return;
    }

    setDetailsLoading(true);

    try {
      const response = await fetch(
        `${API}/documents/review/applications/${encodeURIComponent(
          applicationId
        )}`,
        { credentials: "include" }
      );

      const body = await readResponse(response);
      const list = Array.isArray(body.documents) ? body.documents : [];

      setApplicationDocuments(list);

      const latest = list.find((item) => item._id === document._id);
      if (latest) setSelected(latest);
    } catch (err) {
      setError(err.message || "Unable to load application documents.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const reviewDocument = async (status) => {
    if (!selected?._id) return;

    if (status === "REJECTED" && notes.trim().length < 5) {
      setError("Rejection notes are required and must be at least 5 characters.");
      return;
    }

    const action = status === "VERIFIED" ? "verify" : "reject";

    if (
      !window.confirm(
        `Are you sure you want to ${action} this document?`
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `${API}/documents/review/${encodeURIComponent(selected._id)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            notes: notes.trim(),
          }),
        }
      );

      await readResponse(response);

      setNotice(
        `${documentLabels[selected.documentType] || readable(selected.documentType)} ${status === "VERIFIED" ? "verified" : "rejected"} successfully.`
      );

      setSelected(null);
      setApplicationDocuments([]);
      setNotes("");

      await loadQueue();
    } catch (err) {
      setError(err.message || "The document review could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const previewUrl = selected?._id
    ? `${API}/documents/review/${encodeURIComponent(selected._id)}/file`
    : "";

  return (
    <section className="lm-doc-verification" id="lm-document-verification">
      <div className="lm-doc-heading">
        <div>
          <div className="lm-doc-eyebrow">DOCUMENT OPERATIONS</div>
          <h2>Document verification</h2>
          <p>
            Review customer uploads and record a verification decision.
          </p>
        </div>

        <button
          type="button"
          className="lm-doc-refresh"
          onClick={loadQueue}
          disabled={loading || saving}
        >
          {loading ? "Refreshing…" : "Refresh queue"}
        </button>
      </div>

      {error && (
        <div className="lm-doc-alert error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="lm-doc-alert success" role="status">
          {notice}
        </div>
      )}

      <div className="lm-doc-toolbar">
        <label htmlFor="lm-doc-status">Verification status</label>
        <select
          id="lm-doc-status"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setSelected(null);
            setNotice("");
            setError("");
          }}
          disabled={saving}
        >
          <option value="PENDING">Pending review</option>
          <option value="VERIFIED">Verified documents</option>
          <option value="REJECTED">Rejected documents</option>
        </select>

        <span className="lm-doc-count">
          {documents.length} document{documents.length === 1 ? "" : "s"}
        </span>
      </div>

      {loading ? (
        <div className="lm-doc-empty">Loading document queue…</div>
      ) : documents.length === 0 ? (
        <div className="lm-doc-empty">
          <strong>No documents in this queue</strong>
          <p>Choose another status or refresh to check for new submissions.</p>
        </div>
      ) : (
        <div className="lm-doc-table-wrap">
          <table className="lm-doc-table">
            <thead>
              <tr>
                <th>DOCUMENT</th>
                <th>APPLICANT</th>
                <th>APPLICATION</th>
                <th>SUBMITTED</th>
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => {
                const application = document.application || {};
                const applicant = application.applicant || {};

                return (
                  <tr key={document._id}>
                    <td>
                      <strong>
                        {documentLabels[document.documentType] ||
                          readable(document.documentType)}
                      </strong>
                      <small>{document._id}</small>
                    </td>
                    <td>
                      <strong>{applicant.name || "Applicant"}</strong>
                      <small>
                        {document.submittedBy?.email ||
                          applicant.email ||
                          "—"}
                      </small>
                    </td>
                    <td>
                      <strong>{application.applicationNumber || "—"}</strong>
                      <small>{readable(application.loanType)}</small>
                    </td>
                    <td>{formatDate(document.createdAt)}</td>
                    <td>
                      <span
                        className={`lm-doc-status ${statusClass(
                          document.status
                        )}`}
                      >
                        {readable(document.status)}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="lm-doc-review-button"
                        onClick={() => openDocument(document)}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div
          className="lm-doc-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              setSelected(null);
            }
          }}
        >
          <section
            className="lm-doc-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lm-doc-modal-title"
          >
            <header className="lm-doc-modal-header">
              <div>
                <div className="lm-doc-eyebrow">DOCUMENT REVIEW</div>
                <h3 id="lm-doc-modal-title">
                  {documentLabels[selected.documentType] ||
                    readable(selected.documentType)}
                </h3>
                <p>
                  Application{" "}
                  {selected.application?.applicationNumber ||
                    documents.find((item) => item._id === selected._id)
                      ?.application?.applicationNumber ||
                    "details"}
                </p>
              </div>

              <button
                type="button"
                className="lm-doc-close"
                onClick={() => setSelected(null)}
                disabled={saving}
                aria-label="Close document review"
              >
                ×
              </button>
            </header>

            {detailsLoading ? (
              <div className="lm-doc-empty">Loading document details…</div>
            ) : (
              <>
                <div className="lm-doc-meta">
                  <div>
                    <small>Applicant</small>
                    <strong>
                      {selected.submittedBy?.name ||
                        selected.application?.applicant?.name ||
                        "Applicant"}
                    </strong>
                  </div>
                  <div>
                    <small>Submitted</small>
                    <strong>{formatDate(selected.createdAt)}</strong>
                  </div>
                  <div>
                    <small>Current status</small>
                    <strong>{readable(selected.status)}</strong>
                  </div>
                  {selected.reviewedAt && (
                    <div>
                      <small>Last reviewed</small>
                      <strong>{formatDate(selected.reviewedAt)}</strong>
                    </div>
                  )}
                </div>

                <div className="lm-doc-preview-heading">
                  <strong>Secure file preview</strong>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in new tab ↗
                  </a>
                </div>

                <iframe
                  className="lm-doc-preview"
                  title={`Preview ${documentLabels[selected.documentType] || "document"}`}
                  src={previewUrl}
                  referrerPolicy="no-referrer"
                />

                {selected.reviewNotes && (
                  <div className="lm-doc-previous-notes">
                    <strong>Previous review notes</strong>
                    <p>{selected.reviewNotes}</p>
                  </div>
                )}

                {selected.status === "PENDING" ? (
                  <div className="lm-doc-review-form">
                    <label htmlFor="lm-doc-notes">
                      Review notes{" "}
                      <span>
                        (required for rejection; minimum 5 characters)
                      </span>
                    </label>
                    <textarea
                      id="lm-doc-notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      maxLength={1000}
                      rows={3}
                      placeholder="Record verification findings or explain what needs correction…"
                      disabled={saving}
                    />

                    <div className="lm-doc-actions">
                      <button
                        type="button"
                        className="lm-doc-reject"
                        onClick={() => reviewDocument("REJECTED")}
                        disabled={saving || notes.trim().length < 5}
                      >
                        {saving ? "Saving…" : "Reject document"}
                      </button>

                      <button
                        type="button"
                        className="lm-doc-verify"
                        onClick={() => reviewDocument("VERIFIED")}
                        disabled={saving}
                      >
                        {saving ? "Saving…" : "Verify document ✓"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="lm-doc-readonly">
                    This document has already been reviewed. Its decision
                    cannot be changed through this screen.
                  </div>
                )}

                {applicationDocuments.length > 0 && (
                  <div className="lm-doc-related">
                    <strong>Other documents in this application</strong>
                    {applicationDocuments
                      .filter((item) => item._id !== selected._id)
                      .map((item) => (
                        <button
                          type="button"
                          key={item._id}
                          className="lm-doc-related-item"
                          onClick={() => openDocument(item)}
                          disabled={saving}
                        >
                          <span>
                            {documentLabels[item.documentType] ||
                              readable(item.documentType)}
                          </span>
                          <span
                            className={`lm-doc-status ${statusClass(
                              item.status
                            )}`}
                          >
                            {readable(item.status)}
                          </span>
                        </button>
                      ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
