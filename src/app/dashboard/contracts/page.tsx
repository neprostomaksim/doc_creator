import Link from 'next/link';

export default function ContractsPage() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Договоры</h1>
        <Link
          href="/dashboard/contracts/new"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Создать договор
        </Link>
      </div>
      <p className="text-sm text-gray-500">
        Дела и версии договоров появятся на шаге 4 — пока просто создайте .docx.
      </p>
    </div>
  );
}
