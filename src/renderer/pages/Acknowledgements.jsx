import React from 'react';

const projects = [
  {
    name: 'Claude by Anthropic',
    description: 'The AI that helped debug Cove',
    license: 'Special Thanks',
    url: 'https://www.anthropic.com'
  },
  {
    name: 'Windsurf by Codeium',
    description: 'The AI-powered code editor that helped with writing and iterating Cove\'s codebase',
    license: 'Special Thanks',
    url: 'https://windsurf.com'
  },
  {
    name: 'Chromium',
    description: 'The open-source browser engine that powers Cove\'s web rendering.',
    license: 'BSD 3-Clause License',
    url: 'https://www.chromium.org'
  },
  {
    name: 'Electron',
    description: 'Framework for building cross-platform desktop apps with web technologies.',
    license: 'MIT License',
    url: 'https://www.electronjs.org'
  },
  {
    name: 'React',
    description: 'JavaScript library for building user interfaces, powering Cove\'s UI.',
    license: 'MIT License',
    url: 'https://react.dev'
  },
  {
    name: 'Font Awesome Free',
    description: 'Icon library providing the icons used throughout Cove\'s interface.',
    license: 'CC BY 4.0 · SIL OFL 1.1 · MIT License',
    url: 'https://fontawesome.com'
  },
  {
    name: 'OpenSauceOne',
    description: 'The typeface used throughout Cove\'s UI, designed by Roger Pielke.',
    license: 'SIL Open Font License 1.1',
    url: 'https://github.com/marcologous/Open-Sauce-Fonts'
  },
  {
    name: 'Space Mono',
    description: 'The monospace typeface used for technical labels and navigation in Cove, designed by Colophon Foundry.',
    license: 'SIL Open Font License 1.1',
    url: 'https://fonts.google.com/specimen/Space+Mono'
  },
  {
    name: 'electron-store',
    description: 'Simple data persistence for Electron apps, used for saving Cove\'s settings.',
    license: 'MIT License',
    url: 'https://github.com/sindresorhus/electron-store'
  },
  {
    name: 'webpack',
    description: 'Module bundler used to build Cove\'s renderer process.',
    license: 'MIT License',
    url: 'https://webpack.js.org'
  }
];

export default function Acknowledgements({ onNavigate }) {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      minHeight: '100%',
      background: 'var(--webview-bg)',
      overflowY: 'auto',
      boxSizing: 'border-box'
    }}>
      <div style={{
        padding: '32px 40px',
        maxWidth: 800,
        margin: '0 auto',
        fontFamily: 'OpenSauceOne, sans-serif',
        color: 'var(--text)'
      }}>
        <h1 style={{
          fontSize: 28,
          fontWeight: 600,
          marginBottom: 8,
          color: 'var(--text)'
        }}>
          Acknowledgements
        </h1>
      <p style={{
        fontSize: 14,
        color: 'var(--text-muted)',
        marginBottom: 40
      }}>
        Cove is made possible by the open-source community.
      </p>

      {projects.map((project, index) => (
        <div
          key={index}
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius)',
            padding: '20px 24px',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text)'
            }}>
              {project.name}
            </div>
            <div style={{
              fontSize: 13,
              color: 'var(--text-muted)',
              marginTop: 2
            }}>
              {project.description}
            </div>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 8
          }}>
            <span style={{
              background: project.license === 'Special Thanks' ? 'linear-gradient(135deg, var(--accent), var(--accent-dk))' : 'var(--accent)',
              color: '#FFFFFF',
              borderRadius: 'var(--radius-xs)',
              padding: '2px 8px',
              fontSize: 11,
              whiteSpace: 'nowrap'
            }}>
              {project.license}
            </span>
            <button
              onClick={() => onNavigate(project.url)}
              style={{
                fontSize: 12,
                color: 'var(--accent)',
                textDecoration: 'none',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                padding: 0
              }}
            >
              Visit Website →
            </button>
          </div>
        </div>
      ))}

      <div style={{
        marginTop: 40,
        paddingTop: 20,
        borderTop: '1px solid var(--border)',
        fontSize: 12,
        color: 'var(--text-muted)',
        textAlign: 'center'
      }}>
        All trademarks and registered trademarks are the property of their respective owners.
      </div>
      </div>
    </div>
  );
}
