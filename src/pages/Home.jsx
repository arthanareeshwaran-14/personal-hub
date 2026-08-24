import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import About from "../components/About";
import Skills from "../components/Skills";
import Projects from "../components/Projects";
import WorkExperience from "../components/WorkExperience";
import Education from "../components/Education";
import Contact from "../components/Contact";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <Hero />
        <About />
        <Skills />
        <Projects />
        <WorkExperience />
        <Education />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
