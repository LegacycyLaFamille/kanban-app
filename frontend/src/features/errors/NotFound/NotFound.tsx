import { Link } from "react-router-dom";
import "../error.css";

export default function NotFound() {
  return (
    <main className="not-found">
      <div className="not-found__glow" />

      <div className="not-found__content">
        <div className="not-found__code">
          <span>4</span>

          <div className="not-found__zero">
            <div className="not-found__zero-inner" />
          </div>

          <span>4</span>
        </div>

        <div className="not-found__badge">
          <span className="not-found__dot" />
          ERROR 404
        </div>

        <h1>Page not found</h1>

        <p>
          Oops... this page seems to have disappeared into the network.
          <br />
          Check the URL or head back to the homepage.
        </p>

        <div className="not-found__actions">
          <Link to="/projects" className="not-found__button">
            Back to homepage
            <span aria-hidden="true">→</span>
          </Link>

          <button
            type="button"
            className="not-found__back"
            onClick={() => window.history.back()}
          >
            <span aria-hidden="true">←</span> Go back
          </button>
        </div>
      </div>

      <div className="not-found__corner not-found__corner--top">
        SYS_404 // PAGE_NOT_FOUND
      </div>

      <div className="not-found__corner not-found__corner--bottom">
        STATUS: <span>NOT FOUND</span>
      </div>
    </main>
  );
}
