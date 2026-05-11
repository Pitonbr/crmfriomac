/**
 * Exibe o nome de um usuário com indicador visual (?) quando ele foi excluído.
 * Os dados associados a esse usuário PERMANECEM na base de dados.
 */

interface UserNameTagProps {
  nome: string;
  excluido?: boolean;
  style?: React.CSSProperties;
}

export function UserNameTag({ nome, excluido = false, style }: UserNameTagProps) {
  if (!excluido) {
    return <span style={style}>{nome}</span>;
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, ...style }}>
      <span style={{ color: 'var(--text-3)', textDecoration: 'line-through' }}>{nome}</span>
      <span
        title="Este usuário foi excluído do sistema. Todos os dados e histórico foram preservados na base de dados."
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: 'var(--danger-bg)',
          color: 'var(--danger)',
          fontSize: '0.65rem',
          fontWeight: 900,
          cursor: 'help',
          border: '1px solid var(--danger)',
          flexShrink: 0,
          lineHeight: 1,
        }}
        aria-label="Usuário excluído — dados preservados"
      >
        ?
      </span>
    </span>
  );
}

/**
 * Versão simples: recebe nome (string) e marca (?) se o nome indica usuário excluído.
 * Útil para autor_nome que vem de observações, audit log, etc.
 */
export function AutorNome({ nome, foiExcluido = false }: { nome: string; foiExcluido?: boolean }) {
  return <UserNameTag nome={nome} excluido={foiExcluido} />;
}
