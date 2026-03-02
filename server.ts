import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import JSZip from "jszip";

const db = new Database("apm.db");
db.pragma('foreign_keys = ON');

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    owner_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    title TEXT,
    description TEXT,
    status TEXT DEFAULT 'todo',
    priority TEXT DEFAULT 'medium',
    health_status TEXT DEFAULT 'on_track',
    assignee_id INTEGER,
    due_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id),
    FOREIGN KEY(assignee_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    user_id INTEGER,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(task_id) REFERENCES tasks(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    user_id INTEGER,
    file_name TEXT,
    file_url TEXT,
    file_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(task_id) REFERENCES tasks(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Migrations
try {
  db.prepare("SELECT health_status FROM tasks LIMIT 1").get();
} catch (e) {
  console.log("Adding health_status column to tasks table...");
  db.exec("ALTER TABLE tasks ADD COLUMN health_status TEXT DEFAULT 'on_track'");
}

// Seed admin user if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
if (!adminExists) {
  db.prepare("INSERT INTO users (email, password, full_name, role) VALUES (?, ?, ?, ?)").run(
    "admin@apm.com",
    "admin123",
    "System Administrator",
    "admin"
  );
}

// Seed demo project if not exists
const projectExists = db.prepare("SELECT * FROM projects").get();
if (!projectExists) {
  const admin = db.prepare("SELECT id FROM users WHERE email = 'admin@apm.com'").get();
  const projectId = db.prepare("INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)").run(
    "APM Launch",
    "Main project for launching the Advanced Project Management platform.",
    admin.id
  ).lastInsertRowid;

  const tasks = [
    { title: "Design System", desc: "Create a comprehensive design system for the app.", priority: "high", status: "done", due: "2024-03-15" },
    { title: "Backend API", desc: "Implement Express server and SQLite database.", priority: "high", status: "in_progress", due: "2024-03-20" },
    { title: "User Management", desc: "Build admin panel for user control.", priority: "medium", status: "todo", due: "2024-03-25" },
    { title: "Gantt Chart View", desc: "Implement timeline visualization for tasks.", priority: "low", status: "todo", due: "2024-04-01" },
  ];

  for (const task of tasks) {
    db.prepare("INSERT INTO tasks (project_id, title, description, priority, status, due_date) VALUES (?, ?, ?, ?, ?, ?)").run(
      projectId, task.title, task.desc, task.priority, task.status, task.due
    );
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password);
    if (user) {
      if (user.status === 'inactive') {
        return res.status(403).json({ error: "Account is deactivated" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.post("/api/signup", (req, res) => {
    const { email, password, full_name } = req.body;
    try {
      const result = db.prepare("INSERT INTO users (email, password, full_name, role) VALUES (?, ?, ?, ?)").run(
        email,
        password,
        full_name,
        'user'
      );
      const newUser = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
      const { password: _, ...userWithoutPassword } = newUser;
      res.json(userWithoutPassword);
    } catch (e) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  // User Management (Admin Only)
  app.get("/api/admin/users", (req, res) => {
    const users = db.prepare("SELECT id, email, full_name, role, status, created_at FROM users").all();
    res.json(users);
  });

  app.post("/api/admin/users", (req, res) => {
    const { email, password, full_name, role } = req.body;
    try {
      db.prepare("INSERT INTO users (email, password, full_name, role) VALUES (?, ?, ?, ?)").run(email, password, full_name, role);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.patch("/api/admin/users/:id", (req, res) => {
    const { id } = req.params;
    const { status, role, full_name, password } = req.body;
    
    if (password) {
      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(password, id);
    }
    if (status) {
      db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, id);
    }
    if (role) {
      db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
    }
    if (full_name) {
      db.prepare("UPDATE users SET full_name = ? WHERE id = ?").run(full_name, id);
    }
    
    res.json({ success: true });
  });

  app.delete("/api/admin/users/:id", (req, res) => {
    const { id } = req.params;
    const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get().count;
    const userToDelete = db.prepare("SELECT role FROM users WHERE id = ?").get(id);
    
    if (userToDelete?.role === 'admin' && adminCount <= 1) {
      return res.status(400).json({ error: "Cannot delete the last administrator" });
    }
    
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.post("/api/user/change-password", (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    
    if (!user || user.password !== currentPassword) {
      return res.status(400).json({ error: "Invalid current password" });
    }
    
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(newPassword, userId);
    res.json({ success: true });
  });

  // Projects
  app.get("/api/projects", (req, res) => {
    const projects = db.prepare("SELECT * FROM projects").all();
    res.json(projects);
  });

  app.post("/api/projects", (req, res) => {
    try {
      const { name, description, owner_id } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Project name is required" });
      }
      const result = db.prepare("INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)").run(name, description, owner_id);
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      console.error("Error creating project:", error);
      res.status(500).json({ error: error.message || "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id", (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    try {
      if (name) db.prepare("UPDATE projects SET name = ? WHERE id = ?").run(name, id);
      if (description !== undefined) db.prepare("UPDATE projects SET description = ? WHERE id = ?").run(description, id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating project:", error);
      res.status(500).json({ error: error.message || "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", (req, res) => {
    const { id } = req.params;
    try {
      // Start a transaction to ensure all related data is deleted
      db.transaction(() => {
        // Delete attachments for tasks in this project
        db.prepare(`
          DELETE FROM attachments 
          WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)
        `).run(id);

        // Delete comments for tasks in this project
        db.prepare(`
          DELETE FROM comments 
          WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)
        `).run(id);

        // Delete tasks in this project
        db.prepare("DELETE FROM tasks WHERE project_id = ?").run(id);

        // Finally delete the project
        db.prepare("DELETE FROM projects WHERE id = ?").run(id);
      })();

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting project:", error);
      res.status(500).json({ error: error.message || "Failed to delete project" });
    }
  });

  // Tasks
  app.get("/api/tasks", (req, res) => {
    const tasks = db.prepare(`
      SELECT t.*, u.full_name as assignee_name, p.name as project_name,
      (SELECT COUNT(*) FROM comments WHERE task_id = t.id) as comments_count,
      (SELECT COUNT(*) FROM attachments WHERE task_id = t.id) as attachments_count
      FROM tasks t 
      LEFT JOIN users u ON t.assignee_id = u.id 
      LEFT JOIN projects p ON t.project_id = p.id
    `).all();
    res.json(tasks);
  });

  app.get("/api/projects/:id/tasks", (req, res) => {
    const tasks = db.prepare(`
      SELECT t.*, u.full_name as assignee_name,
      (SELECT COUNT(*) FROM comments WHERE task_id = t.id) as comments_count,
      (SELECT COUNT(*) FROM attachments WHERE task_id = t.id) as attachments_count
      FROM tasks t 
      LEFT JOIN users u ON t.assignee_id = u.id 
      WHERE t.project_id = ?
    `).all(req.params.id);
    res.json(tasks);
  });

  app.post("/api/tasks", (req, res) => {
    try {
      const { project_id, title, description, priority, assignee_id, due_date, health_status } = req.body;
      
      if (!project_id || !title) {
        return res.status(400).json({ error: "Project ID and Title are required" });
      }

      // Ensure assignee_id is a valid ID or null
      const finalAssigneeId = (assignee_id && assignee_id > 0) ? assignee_id : null;

      const result = db.prepare("INSERT INTO tasks (project_id, title, description, priority, assignee_id, due_date, health_status) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
        project_id, title, description, priority, finalAssigneeId, due_date, health_status || 'on_track'
      );
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      console.error("Error creating task:", error);
      res.status(500).json({ error: error.message || "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", (req, res) => {
    const { status, title, description, priority, assignee_id, due_date, health_status } = req.body;
    
    if (status) db.prepare("UPDATE tasks SET status = ? WHERE id = ?").run(status, req.params.id);
    if (title) db.prepare("UPDATE tasks SET title = ? WHERE id = ?").run(title, req.params.id);
    if (description) db.prepare("UPDATE tasks SET description = ? WHERE id = ?").run(description, req.params.id);
    if (priority) db.prepare("UPDATE tasks SET priority = ? WHERE id = ?").run(priority, req.params.id);
    if (assignee_id !== undefined) db.prepare("UPDATE tasks SET assignee_id = ? WHERE id = ?").run(assignee_id, req.params.id);
    if (due_date) db.prepare("UPDATE tasks SET due_date = ? WHERE id = ?").run(due_date, req.params.id);
    if (health_status) db.prepare("UPDATE tasks SET health_status = ? WHERE id = ?").run(health_status, req.params.id);
    
    res.json({ success: true });
  });

  app.delete("/api/tasks/:id", (req, res) => {
    const { id } = req.params;
    try {
      // Delete related comments and attachments first if cascade is not set in DB
      // Although we will add cascade to the table definitions for future-proofing
      db.prepare("DELETE FROM comments WHERE task_id = ?").run(id);
      db.prepare("DELETE FROM attachments WHERE task_id = ?").run(id);
      db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Comments
  app.get("/api/tasks/:id/comments", (req, res) => {
    const comments = db.prepare(`
      SELECT c.*, u.full_name as user_name 
      FROM comments c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.task_id = ?
      ORDER BY c.created_at ASC
    `).all(req.params.id);
    res.json(comments);
  });

  app.post("/api/tasks/:id/comments", (req, res) => {
    const { user_id, content } = req.body;
    const result = db.prepare("INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)").run(
      req.params.id, user_id, content
    );
    res.json({ id: result.lastInsertRowid });
  });

  // Attachments (Simulated for now, storing metadata)
  app.get("/api/tasks/:id/attachments", (req, res) => {
    const attachments = db.prepare(`
      SELECT a.*, u.full_name as user_name 
      FROM attachments a 
      JOIN users u ON a.user_id = u.id 
      WHERE a.task_id = ?
    `).all(req.params.id);
    res.json(attachments);
  });

  app.post("/api/tasks/:id/attachments", (req, res) => {
    const { user_id, file_name, file_url, file_type } = req.body;
    const result = db.prepare("INSERT INTO attachments (task_id, user_id, file_name, file_url, file_type) VALUES (?, ?, ?, ?, ?)").run(
      req.params.id, user_id, file_name, file_url, file_type
    );
    res.json({ id: result.lastInsertRowid });
  });

  // Download Project as ZIP
  app.get("/api/download-zip", async (req, res) => {
    try {
      const zip = new JSZip();
      const rootDir = process.cwd();

      const addFilesToZip = (dir: string, zipFolder: JSZip) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stats = fs.statSync(fullPath);

          // Exclude unnecessary directories and files
          if (
            file === "node_modules" ||
            file === "dist" ||
            file === ".git" ||
            file === ".next" ||
            file === "apm.db-journal"
          ) {
            continue;
          }

          if (stats.isDirectory()) {
            addFilesToZip(fullPath, zipFolder.folder(file)!);
          } else {
            zipFolder.file(file, fs.readFileSync(fullPath));
          }
        }
      };

      addFilesToZip(rootDir, zip);

      const content = await zip.generateAsync({ type: "nodebuffer" });

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", "attachment; filename=apm-project.zip");
      res.send(content);
    } catch (error) {
      console.error("Error generating zip:", error);
      res.status(500).send("Failed to generate zip file");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
