export default function Page() {
  return (
    <div>
      add a pcd <br />
      <button onClick={onAddClick}>
        add a new semaphore identity to the passport
      </button>
    </div>
  );
}

function onAddClick() {
  alert("added");
}
