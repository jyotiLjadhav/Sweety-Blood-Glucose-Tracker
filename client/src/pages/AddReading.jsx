import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import ReadingForm from '../components/ReadingForm';

export default function AddReading() {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader subtitle="Log a measurement" title="Add reading" />
      <div className="narrow">
        <section className="card form-card">
          <ReadingForm />
        </section>
        <p className="center">
          <button className="btn-plain" onClick={() => navigate('/readings')}>View all readings</button>
        </p>
      </div>
    </>
  );
}
