const styles = {
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const labels = {
  draft: 'Draft',
  pending: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status] || status}
    </span>
  );
}