          <div>
            <span className="stat-label">Finished</span>
            <strong>{completions.length}</strong>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon stat-violet">◷</span>
          <div>
            <span className="stat-label">History items</span>
            <strong>{historyHomework.length}</strong>
          </div>
        </div>
      </div>

      <section className="panel">
        <div className="section-heading">
          <div className="section-icon">▤</div>
          <div>
            <h2>My Homework</h2>
            <p>Complete these assignments before their due dates.</p>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <p className="empty-state">Loading homework...</p>
        ) : activeHomework.length === 0 ? (
          <EmptyState
            icon="✓"
            title="You're all caught up"
            message="There is no active homework for you right now."
          />
        ) : (
          <div className="homework-list">
            {activeHomework.map((item) => (
              <article className="homework-card" key={item.id}>
                <div className="homework-card-top">
                  <span className="subject-tag">{item.subject}</span>
                  <span className="status-pill status-blue">To do</span>
                </div>

                <h3>{item.subject}</h3>
                <p className="homework-description">
                  {item.homework_text}
                </p>

                <div className="homework-meta">
                  <span>
                    <strong>Due:</strong> {item.due_date}
                  </span>
                </div>

                <div className="homework-card-actions">
                  <button
                    className="button button-primary"
                    onClick={() => finishHomework(item)}
                    disabled={workingId === item.id}
                  >
                    {workingId === item.id ? "Saving..." : "✓ Finished"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="section-heading">
          <div className="section-icon section-icon-green">◷</div>
          <div>
            <h2>History Homework</h2>
            <p>Review finished and past-due assignments.</p>
          </div>
        </div>

        {loading ? (
          <p className="empty-state">Loading history...</p>
        ) : historyHomework.length === 0 ? (
          <EmptyState
            icon="◷"
            title="Your history is empty"
            message="Finished or past-due assignments will appear here."
          />
        ) : (
          <div className="homework-list">
            {historyHomework.map((item) => (
              <article className="homework-card history-card" key={item.id}>
                <div className="homework-card-top">
                  <span className="subject-tag">{item.subject}</span>
                  <span
                    className={`status-pill ${
                      isFinished(item.id) ? "status-green" : "status-muted"
                    }`}
                  >
                    {isFinished(item.id) ? "✓ Finished" : "Past due"}
                  </span>
                </div>

                <h3>{item.subject}</h3>
                <p className="homework-description">
                  {item.homework_text}
                </p>

                <div className="homework-meta">
                  <span>
                    <strong>Due:</strong> {item.due_date}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyState({ icon, title, message }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
