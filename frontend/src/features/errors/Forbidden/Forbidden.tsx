import { Link } from "react-router-dom";
import "../error.css";

export default function Forbidden() {
  return (
    <main className="not-found">
      <div className="not-found__glow" />

      <div className="not-found__content">
        <div className="not-found__code">
          <span>4</span>

          <div className="not-found__zero">
            <div className="not-found__zero-inner" />
          </div>

          <span>3</span>
        </div>

        <div className="not-found__badge">
          <span className="not-found__dot" />
          ERROR 403
        </div>

        <h1>Access forbidden</h1>

        <p>
          You don't have permission to access this page.
          <br />
          Please check your account or return to the homepage.
        </p>

        <div className="not-found__actions">
          <Link to="/projects" className="not-found__button">
            Back to homepage
            <span>→</span>
          </Link>

          <button
            type="button"
            className="not-found__back"
            onClick={() => window.history.back()}
          >
            ← Go back
          </button>
        </div>
      </div>

      <div className="not-found__corner not-found__corner--top">
        SYS_403 // ACCESS_FORBIDDEN
      </div>

      <div className="not-found__corner not-found__corner--bottom">
        STATUS: <span>FORBIDDEN</span>
      </div>
    </main>
  );
}