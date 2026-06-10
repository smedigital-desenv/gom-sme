# Como executar o diagnóstico v37

Este diagnóstico não executa `alter`, `update`, `insert`, `delete`, `drop` ou `create`.

Ele apenas consulta metadados do banco para preparar a próxima etapa: fechamento das permissões RLS.

Se o Supabase mostrar várias grades de resultado, capture ou copie os blocos mais importantes.
Se ele mostrar apenas a última grade, execute os blocos individualmente usando os comentários como separação.
