"""arq worker — entrypoint para jobs assíncronos.

Sobe via:
    arq app.workers.arq_worker.WorkerSettings

Cron registrados aqui são auto-disparados pelo arq quando o worker está rodando.
"""

from arq.connections import RedisSettings
from arq.cron import cron

from app.config import settings
from app.workers.tasks.auto_reativacao import auto_reativar
from app.workers.tasks.sla_alerts import scan_sla


class WorkerSettings:
    redis_settings = RedisSettings.from_dsn(str(settings.redis_url))

    functions = [scan_sla, auto_reativar]

    cron_jobs = [
        # SLA: varre a cada 10 minutos
        cron(scan_sla, minute={0, 10, 20, 30, 40, 50}, run_at_startup=True),
        # Reativação automática: roda uma vez por dia às 06h
        cron(auto_reativar, hour=6, minute=0),
    ]

    max_jobs = 5
    job_timeout = 300
    keep_result = 300
