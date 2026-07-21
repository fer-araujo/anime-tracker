"use client";

import { useState } from "react";
import { useUserLists } from "@/hooks/useUserLists";
import { deleteList } from "@/actions/lists";
import { ListCard } from "./ListCard";
import { CreateListCard } from "./CreateListCard";
import { CreateListDialog } from "./CreateListDialog";

export function CollectionsTab() {
  const { lists, loading, refetch } = useUserLists();
  const [showCreate, setShowCreate] = useState(false);

  const handleDelete = async (id: string) => {
    await deleteList(id);
    refetch();
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[4/3] rounded-2xl bg-white/5 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {lists.map((list) => (
          <ListCard key={list.id} list={list} onDelete={handleDelete} />
        ))}
        <CreateListCard onClick={() => setShowCreate(true)} />
      </div>

      <CreateListDialog
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={refetch}
      />
    </>
  );
}
