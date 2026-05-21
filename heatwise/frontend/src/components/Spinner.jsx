function Spinner({ size = 24, label }) {
    return (
      <div className="spinner-wrap">
        <div
          className="spinner"
          style={{ width: size, height: size, borderWidth: Math.max(2, size / 8) }}
        />
        {label && <div className="spinner-label">{label}</div>}
      </div>
    )
  }

  export default Spinner
