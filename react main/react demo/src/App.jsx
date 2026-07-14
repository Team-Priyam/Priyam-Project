import { useState, useEffect } from "react";
import StudentForm from "./components/StudentForm";
import StudentCard from "./components/StudentCard";
import "./App.css";

function App() {
 const [student, setStudent] = useState(null);

 useEffect(() => {
 if (student) {
 document.title = `Welcome, ${student.name}`;
 } else {
 document.title = "Student Profile Manager";
 }
 }, [student]);

 return (
 <div className="container">
 <h1>Student Profile Manager</h1>

 <StudentForm setStudent={setStudent} />

 <hr />

 {student ? (
 <StudentCard student={student} />
 ) : (
 <h3>No Student Added Yet</h3>
 )}
 </div>
 );
}

export default App;