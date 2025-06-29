import ProtectedRoutes from "@/components/ProtectedRoutes";

export default function Dashboard() {
  return (
    <ProtectedRoutes>
      <div>Welcome to Dashboard</div>
    </ProtectedRoutes>
  );
}
