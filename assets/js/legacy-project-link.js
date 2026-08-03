(() => {
  const parameters = new URLSearchParams(location.search);
  const selected = parameters.get("project") ?? parameters.get("projeto") ?? parameters.get("proyecto");
  const projectsRoute = document.body.dataset.projectsRoute;

  if (!selected?.trim() || !projectsRoute) return;

  const target = new URL(projectsRoute, location.origin);
  target.searchParams.set("project", selected.trim().toLowerCase());
  location.replace(`${target.pathname}${target.search}${location.hash}`);
})();
