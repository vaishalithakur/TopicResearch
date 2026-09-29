import Icon from '../Icon.jsx'

// Tasks get grouped under these headings, in this order
const PRIORITY_ORDER = ['high', 'medium', 'low']

export default function NextStepsTab({ nextSteps, sources, onChange, onSearch }) {
  const { tasks, questions, followUps } = nextSteps

  const doneCount = tasks.filter((task) => task.done).length
  const percentDone = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0

  // Handy lookup so we can find a source by its id, e.g. sourcesById['s1']
  const sourcesById = {}
  for (const source of sources) {
    sourcesById[source.id] = source
  }

  // Tick or untick a task
  function toggleTask(taskId) {
    const updatedTasks = tasks.map((task) => {
      if (task.id !== taskId) return task
      return { ...task, done: !task.done }
    })
    onChange({ ...nextSteps, tasks: updatedTasks })
  }

  return (
    <div className="next-layout">
      <div className="stack">
        <article className="card">
          <div className="progress-head">
            {/* The CSS reads --pct to draw the progress ring */}
            <div className="ring" style={{ '--pct': percentDone }}>
              <span className="mono">{percentDone}%</span>
            </div>
            <div>
              <h3>Action plan</h3>
              <p className="muted small">{doneCount} of {tasks.length} tasks complete</p>
            </div>
          </div>

          {PRIORITY_ORDER.map((priority) => {
            const tasksInGroup = tasks.filter((task) => task.priority === priority)

            // Nothing at this priority? Skip the whole group.
            if (tasksInGroup.length === 0) return null

            return (
              <div key={priority} className="task-group">
                <h4 className={`prio prio-${priority}`}>{priority} priority</h4>

                <ul className="tasks">
                  {tasksInGroup.map((task) => (
                    <li key={task.id} className={task.done ? 'done' : ''}>
                      <label>
                        <input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} />
                        <span className="checkbox"><Icon name="check" size={12} strokeWidth={3} /></span>
                        <span className="task-text">{task.text}</span>
                      </label>

                      {task.sourceId && (
                        <span className="cite" title={sourcesById[task.sourceId]?.title}>
                          {task.sourceId}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </article>
      </div>

      <div className="stack">
        <article className="card">
          <h3 className="card-title"><Icon name="help" size={16} /> Open questions</h3>
          <ol className="questions">
            {questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ol>
        </article>

        <article className="card">
          <h3 className="card-title"><Icon name="compass" size={16} /> Explore next</h3>
          <p className="muted small">Start a new research run on a related topic.</p>

          <div className="followups">
            {followUps.map((relatedTopic) => (
              <button key={relatedTopic} className="followup" onClick={() => onSearch(relatedTopic)}>
                <span>{relatedTopic}</span>
                <Icon name="arrowRight" size={14} />
              </button>
            ))}
          </div>
        </article>
      </div>
    </div>
  )
}
