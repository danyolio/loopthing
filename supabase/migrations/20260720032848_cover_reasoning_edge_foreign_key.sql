-- Cover the composite foreign key used when a reasoning node is removed.
drop index public.reasoning_edges_to_node_idx;

create index reasoning_edges_project_to_node_idx
  on public.reasoning_edges (project_id, to_node_id);
