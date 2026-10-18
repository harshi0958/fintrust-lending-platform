
import { useCallback, useEffect, useMemo, useState } from "react";
import "./CustomerDocuments.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const DOCUMENT_TYPES = [
  { value: "AADHAAR", label: "Aadhaar card" },
  { value: "PAN", label: "PAN card" },
  { value: "SALARY_SLIP", label: "Salary slip" },
  { value: "BANK_PASSBOOK", label: "Bank passbook" },
  { value: "PROPERTY_DOCUMENT", label: "Property document" },
  { value: "GOLD_DOCUMENT", label: "Gold document" },
  { value: "IDENTITY_PROOF", label: "Identity proof" },
  { value: "ADDRESS_PROOF", label: "Address proof" },
  { value: "OTHER", label: "Other document" },
];

const getId = (item) => item?._id || item?.id || "";

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const statusClass = (status = "PENDING") =>
  String(status).toLowerCase().replaceAll("_", "-");

export default function CustomerDocuments({
  applications = [],
  onRefresh,
}) {
  const eligibleApplications = useMemo(
    () => applications.filter((app) => getId(app)),
    [applications]
  );

  const [applicationId, setApplicationId] = useState("");
  const [documentType, setDocumentType] = useState("AADHAAR");
  const [file, setFile] = useState(null);
  const [resubmitDocumentId, setResubmitDocumentId] = useState("");
  const [documentsByApplication, setDocumentsByApplication] = useState({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!eligibleApplications.length) {
      setApplicationId("");
      return;
    }

    setApplicationId((current) =>
      eligibleApplications.some((app) => getId(app) === current)
        ? current
        : getId(eligibleApplications[0])
    );
  }, [eligibleApplications]);

  const loadDocuments = useCallback(async () => {
    if (!eligibleApplications.length) {
      setDocumentsByApplication({});
      return;
    }

    setLoading(true);
    setError("");

    try {
      const entries = await Promise.all(
        eligibleApplications.map(async (app) => {
          const id = getId(app);

          const response = await fetch(
            `${API}/documents/my/${encodeURIComponent(id)}`,
            { credentials: "include" }
          );

          const body = await response.json().catch(() => ({}));

          if (response.status === 401) {
            window.location.assign("/login");
            throw new Error("Your session has expired.");
          }

          if (!response.ok) {
            throw new Error(
              body.message || "Unable to load document statuses."
            );
          }

          return [id, Array.isArray(body.documents) ? body.documents : []];
        })
      );

      setDocumentsByApplication(Object.fromEntries(entries));
    } catch (err) {
      setError(err.message || "Unable to load your documents.");
    } finally {
      setLoading(false);
    }
  }, [eligibleApplications]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const currentApplication = eligibleApplications.find(
    (app) => getId(app) === applicationId
  );

  const currentDocuments = documentsByApplication[applicationId] || [];

  const isFinalApplication = ["APPROVED", "REJECTED"].includes(
    currentApplication?.status
  );

  const beginResubmission = (document) => {
    setApplicationId(getId(currentApplication));
    setDocumentType(document.documentType);
    setResubmitDocumentId(document._id);
    setFile(null);
    setError("");
    setNotice(
      "Choose the corrected file for this rejected document."
    );

    document
      ?.documentType &&
      document.getBoundingClientRect?.();

    document?.documentType &&
      window.setTimeout(() => {
        document
          ?.documentType &&
          document.getBoundingClientRect?.();
      }, 0);
  };

  const cancelResubmission = () => {
    setResubmitDocumentId("");
    setFile(null);
    setNotice("");
  };

  const submitDocument = async (event) => {
    event.preventDefault();

    if (!applicationId || !file) {
      setError("Select a loan application and a document file.");
      return;
    }

    setUploading(true);
    setError("");
    setNotice("");

    try {
      const data = new FormData();
      data.append("applicationId", applicationId);
      data.append("documentType", documentType);
      data.append("document", file);

      if (resubmitDocumentId) {
        data.append("resubmitDocumentId", resubmitDocumentId);
      }

      const response = await fetch(`${API}/documents/upload`, {
        method: "POST",
        credentials: "include",
        body: data,
      });

      const body = await response.json().catch(() => ({}));

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(body.message || "Document upload failed.");
      }

      setNotice(
        body.message || "Document submitted for verification."
      );
      setFile(null);
      setResubmitDocumentId("");

      const fileInput = event.currentTarget.querySelector(
        'input[type="file"]'
      );
      if (fileInput) fileInput.value = "";

      await loadDocuments();
      if (onRefresh) await onRefresh();
    } catch (err) {
      setError(err.message || "Unable to upload the document.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="ft-documents" id="ft-documents">
      <div className="ft-documents-heading">
        <div>
          <div className="ft-documents-eyebrow">DOCUMENT CENTRE</div>
          <h2>Documents & verification</h2>
          <p>
            Submit supporting documents and follow their verification
            status.
          </p>
        </div>

        <button
          type="button"
          className="ft-documents-refresh"
          onClick={loadDocuments}
          disabled={loading || uploading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="ft-documents-alert error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="ft-documents-alert success" role="status">
          {notice}
        </div>
      )}

      {!eligibleApplications.length ? (
        <div className="ft-documents-empty">
          <strong>Apply for a loan first</strong>
          <p>
            Once you have submitted a loan application, you can upload
            the documents required for its review.
          </p>
        </div>
      ) : (
        <>
          <form
            className="ft-document-upload"
            onSubmit={submitDocument}
          >
            <h3>
              {resubmitDocumentId
                ? "Resubmit rejected document"
                : "Upload a document"}
            </h3>

            <label>
              Loan application
              <select
                value={applicationId}
                onChange={(event) => {
                  setApplicationId(event.target.value);
                  setResubmitDocumentId("");
                  setFile(null);
                  setNotice("");
                }}
                disabled={uploading}
                required
              >
                {eligibleApplications.map((app) => (
                  <option key={getId(app)} value={getId(app)}>
                    {app.applicationNumber ||
                      `Application ${getId(app).slice(-6)}`}{" "}
                    · {String(app.status || "SUBMITTED").replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Document type
              <select
                value={documentType}
                onChange={(event) => setDocumentType(event.target.value)}
                disabled={uploading || Boolean(resubmitDocumentId)}
                required
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Select file (PDF, JPG or PNG · maximum 5 MB)
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={(event) =>
                  setFile(event.target.files?.[0] || null)
                }
                disabled={uploading || isFinalApplication}
                required
              />
            </label>

            {isFinalApplication && (
              <p className="ft-document-hint">
                Uploads are disabled because this loan application has
                a final decision.
              </p>
            )}

            {resubmitDocumentId && (
              <button
                type="button"
                className="ft-documents-cancel"
                onClick={cancelResubmission}
                disabled={uploading}
              >
                Cancel resubmission
              </button>
            )}

            <button
              type="submit"
              className="ft-documents-submit"
              disabled={
                uploading ||
                isFinalApplication ||
                !file ||
                !applicationId
              }
            >
              {uploading
                ? "Uploading…"
                : resubmitDocumentId
                  ? "Resubmit document"
                  : "Upload for verification"}
            </button>

            <p className="ft-document-hint">
              Files are stored privately. Upload only documents you are
              authorized to share.
            </p>
          </form>

          <div className="ft-document-list">
            <div className="ft-document-list-heading">
              <h3>Your submitted documents</h3>
              <span>{currentDocuments.length} total</span>
            </div>

            {loading && !currentDocuments.length ? (
              <p className="ft-document-muted">Loading documents…</p>
            ) : currentDocuments.length === 0 ? (
              <div className="ft-documents-empty">
                <strong>No documents submitted yet</strong>
                <p>
                  Your uploaded documents and verification decisions
                  will appear here.
                </p>
              </div>
            ) : (
              currentDocuments.map((document) => {
                const type = DOCUMENT_TYPES.find(
                  (item) => item.value === document.documentType
                );

                return (
                  <article
                    className="ft-document-row"
                    key={document._id}
                  >
                    <div className="ft-document-file-icon">PDF</div>

                    <div className="ft-document-details">
                      <strong>
                        {type?.label || document.documentType}
                      </strong>
                      <span>
                        Submitted {formatDate(document.createdAt)}
                      </span>

                      {document.status === "REJECTED" &&
                        document.reviewNotes && (
                          <p className="ft-document-review-note">
                            <strong>Review note:</strong>{" "}
                            {document.reviewNotes}
                          </p>
                        )}

                      {document.status === "VERIFIED" &&
                        document.reviewedAt && (
                          <span>
                            Verified {formatDate(document.reviewedAt)}
                          </span>
                        )}
                    </div>

                    <div className="ft-document-actions">
                      <span
                        className={`ft-document-status ${statusClass(
                          document.status
                        )}`}
                      >
                        {String(document.status || "PENDING").replaceAll(
                          "_",
                          " "
                        )}
                      </span>

                      {document.status === "REJECTED" &&
                        !isFinalApplication && (
                          <button
                            type="button"
                            className="ft-document-resubmit"
                            onClick={() => {
                              setDocumentType(document.documentType);
                              setResubmitDocumentId(document._id);
                              setFile(null);
                              setError("");
                              setNotice(
                                "Choose the corrected file for this rejected document."
                              );
                              document?.documentType &&
                                setApplicationId(applicationId);
                              window.document
                                .getElementById("ft-documents")
                                ?.scrollIntoView({ behavior: "smooth" });
                            }}
                          >
                            Resubmit
                          </button>
                        )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </>
      )}
    </section>
  );
}
