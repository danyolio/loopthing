insert into public.project_templates (slug, title, description, initial_document)
values (
  'long-form-writing',
  'Long-form writing',
  'Develop an essay, article, or thesis through research, critique, and revision.',
  E'# Working thesis\n\nWhat is the strongest version of the argument today?\n\n## Draft\n\nStart with unfinished ideas. Structure can come later.\n\n## Evidence and examples\n\nAdd sources beside the claims they support or challenge.\n\n## Counterarguments\n\nWhat would a thoughtful critic say?\n\n## Open questions\n\nWhat still needs research, reflection, or a decision?'
)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  initial_document = excluded.initial_document;
