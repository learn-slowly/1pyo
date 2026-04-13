import ApplyForm from '@/components/apply/ApplyForm';

export const metadata = {
  title: '참관인 신청 - 2026한표',
  description: '정의당 투개표 참관인 신청',
};

export default function ApplyPage() {
  return (
    <main className="min-h-screen bg-white">
      <ApplyForm />
    </main>
  );
}
