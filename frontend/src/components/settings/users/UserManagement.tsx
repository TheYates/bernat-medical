import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { UserTable } from "./UserTable";
import { CreateUserDialog } from "./CreateUserDialog";
import { useUsers } from "@/hooks/useUsers";

export function UserManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { users, isLoading, error, refetch } = useUsers();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Users</h2>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {error && (
        <div className="text-red-500">Error loading users: {error}</div>
      )}

      <UserTable users={users} isLoading={isLoading} onUserUpdated={refetch} />

      <CreateUserDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
