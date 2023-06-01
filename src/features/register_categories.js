let root = {
  categories: [
    {
      name: "Global",
      ordinal: 1,
      categories: [
        {
          name: "Style",
          description: "Change the way the site looks and behaves.",
          ordinal: -1,
        },
      ],
    },
    {
      name: "Profile",
      description: "Customize the display when browsing profiles.",
      ordinal: 2,
    },
    {
      name: "Editing",
      description: "Additional tools to make editing profiles easier.",
      ordinal: 3,
      categories: [
        {
          name: "Add Person",
          description: "Tools to simplify the process when adding a new person to the tree.",
        },
        {
          name: "Edit Profile",
          description: "Enhancements to the profile edit page.",
        },
      ],
    },
    {
      name: "Navigation",
      description: "Improve menus and interaction with links on profiles.",
      ordinal: 4,
      categories: [
        {
          name: "Find Menu",
          description: "Additional links for the Find menu.",
        },
      ],
    },
    {
      name: "Community",
      description: "Enhance your interaction with other WikiTreers.",
      ordinal: 5,
    },
  ],
};

export function categorize(features) {
  let tree = JSON.parse(JSON.stringify(root)); // deep clone so that we don't modify the category definitions
  tree.depth = 0;
  let index = [];
  function traverse(category) {
    index[category.path ?? ""] = category;
    category.children = Array.from(category.categories ?? []); // shallow clone sub-categories to be sorted with features
    if (category.categories?.length > 0) {
      category.categories.forEach(function (subcategory) {
        if (!subcategory.id && subcategory.name) {
          subcategory.id = subcategory.name.replace(/[\W_]+/g, "_");
        }
        subcategory.parent = category;
        subcategory.path = (category.path ? category.path + "/" : "") + subcategory.id;
        subcategory.depth = (category.depth ?? 0) + 1;
        traverse(subcategory);
      });
    }
  }
  traverse(tree);

  // add sorted features to their corresponding category
  features.forEach(function (feature) {
    let category;
    // If a new feature is added with a new category, add the category to the end of the list
    if (!(category = index[feature.category])) {
      let path = "";
      let parent = tree;
      for (let part of feature.category.split("/")) {
        path += (path ? "/" : "") + part;
        if (!(category = index[path])) {
          category = { name: part, parent: parent, path: path, depth: parent.depth + 1 };
          (parent.categories ??= []).push(category);
          (parent.children ??= []).push(category);
          index[category.path] = category;
        }
        parent = category;
      }
    }
    (category.children ??= []).push(feature);
  });

  function compareOrdinalAndName(a, b) {
    // Sort first by ordinal (positives first, 0/undefined next, negatives last/reversed), and then alphabetically
    let a$ = a.ordinal > 0 ? 1 : a.ordinal < 0 ? -1 : 0;
    let b$ = b.ordinal > 0 ? 1 : b.ordinal < 0 ? -1 : 0;
    if (a$ > b$) {
      return -1;
    } else if (a$ < b$) {
      return 1;
    } else if (a.ordinal < b.ordinal) {
      return -1;
    } else if (a.ordinal > b.ordinal) {
      return 1;
    }
    return a.name.localeCompare(b.name);
  }

  for (let i in index) {
    let c = index[i];
    if (c?.children) {
      c.children.sort(compareOrdinalAndName);
    }
  }

  return tree;
}
