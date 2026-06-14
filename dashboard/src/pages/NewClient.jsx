import { useNavigate, Link } from 'react-router-dom';
import { createClient } from '../api.js';
import ClientForm from '../components/ClientForm.jsx';

export default function NewClient() {
  const navigate = useNavigate();

  async function handleCreate(form) {
    const client = await createClient(form);
    navigate(`/clients/${client.id}`);
  }

  return (
    <div>
      <Link to="/clients" className="text-sm text-slate-500 hover:text-slate-700">&larr; Back to clients</Link>
      <h1 className="mt-2 mb-6 text-2xl font-bold text-slate-900">Add a new client</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <ClientForm onSubmit={handleCreate} submitLabel="Create client" />
      </div>
    </div>
  );
}
