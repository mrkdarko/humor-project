import { createClient } from "@/utils/supabase/server";

type Member = {
  id: string | number;
  created_at?: string | null;
  created_At?: string | null;
  person_name?: string | null;
  preson_name?: string | null;
};

function formatCreatedAt(value: string | null) {
  if (!value) {
    return "No created date";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function Home() {
  const supabase = await createClient();
  const { data: members, error } = await supabase
    .from("Members")
    .select("*")
    .returns<Member[]>();

  const memberCount = members?.length ?? 0;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-12">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
              Supabase table
            </p>
            <h1 className="text-3xl font-semibold">Members List</h1>
            <p className="text-gray-600">
              Rows loaded from the <code>Members</code> table in Supabase.
            </p>
          </div>

          {!error ? (
            <p className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600">
              {memberCount} {memberCount === 1 ? "member" : "members"}
            </p>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
            <p className="font-medium">Could not fetch rows.</p>
            <p className="mt-1 text-sm">{error.message}</p>
          </div>
        ) : members && members.length > 0 ? (
          <ul className="space-y-4">
            {members.map((member, index) => (
              <li
                className="rounded-md border border-gray-200 bg-white p-4 shadow-sm"
                key={String(member.id ?? index)}
              >
                <h2 className="text-lg font-medium">
                  {member.person_name || member.preson_name || `Member ${index + 1}`}
                </h2>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded bg-gray-50 p-3">
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      ID
                    </dt>
                    <dd className="mt-1 break-words text-sm text-gray-800">
                      {member.id}
                    </dd>
                  </div>
                  <div className="rounded bg-gray-50 p-3">
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Created at
                    </dt>
                    <dd className="mt-1 break-words text-sm text-gray-800">
                      {formatCreatedAt(member.created_at ?? member.created_At ?? null)}
                    </dd>
                  </div>
                  <div className="rounded bg-gray-50 p-3 sm:col-span-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Person name
                    </dt>
                    <dd className="mt-1 break-words text-sm text-gray-800">
                      {member.person_name || member.preson_name || "No person name"}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-md border border-gray-200 p-4 text-gray-600">
            No rows found yet. Add a row to the <code>Members</code> table in
            Supabase, then refresh this page.
          </div>
        )}
      </div>
    </main>
  );
}
