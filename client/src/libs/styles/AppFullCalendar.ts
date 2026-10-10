'use client'

// MUI imports
import { styled } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'

const TEXT = (color: string) => `color-mix(in srgb, var(--mui-palette-${color}-main) 55%, var(--contrast-mix, black))`

// Estilos de FullCalendar adaptados de Materio: colores del tema por variables CSS, sin colores fijos.
const AppFullCalendar = styled('div')(({ theme }: { theme: Theme }) => ({
  display: 'flex',
  position: 'relative',
  borderRadius: 'var(--mui-shape-borderRadius)',
  '& .fc': {
    zIndex: 1,
    flexGrow: 1,
    minWidth: 0,

    '.fc-col-header, .fc-daygrid-body, .fc-scrollgrid-sync-table, .fc-timegrid-body, .fc-timegrid-body table': {
      width: '100% !important'
    },

    // Toolbar
    '& .fc-toolbar': {
      flexWrap: 'wrap',
      flexDirection: 'row !important',
      '&.fc-header-toolbar': {
        gap: theme.spacing(2),
        marginBottom: theme.spacing(5)
      },
      '& .fc-button-group:has(.fc-next-button)': {
        marginInlineStart: theme.spacing(2)
      },
      '& .fc-button': {
        padding: theme.spacing(),
        '&:active, &:focus': {
          boxShadow: 'none'
        }
      },
      '.fc-prev-button, & .fc-next-button': {
        display: 'flex',
        backgroundColor: 'transparent',
        padding: theme.spacing(1.5),
        border: '1px solid var(--mui-palette-secondary-main)',
        borderRadius: 'var(--mui-shape-borderRadius) !important',
        '& .fc-icon': {
          color: 'var(--mui-palette-text-secondary)',
          fontSize: '1.25rem'
        },
        '&:hover, &:active, &:focus': {
          boxShadow: 'none !important',
          backgroundColor: 'transparent !important'
        }
      },
      '& .fc-toolbar-chunk:first-of-type': {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        rowGap: theme.spacing(2),
        [theme.breakpoints.down('md')]: {
          '& div:first-of-type': {
            display: 'flex',
            alignItems: 'center'
          }
        }
      },
      '& .fc-button-group': {
        '& .fc-button': {
          textTransform: 'capitalize',
          '&:focus': {
            boxShadow: 'none'
          }
        },
        '& .fc-button-primary': {
          '&:not(.fc-prev-button):not(.fc-next-button)': {
            ...theme.typography.button,
            textTransform: 'capitalize',
            backgroundColor: 'transparent',
            padding: theme.spacing(1.75, 4),
            color: TEXT('primary'),
            borderColor: 'var(--mui-palette-primary-main)',
            '&.fc-button-active, &:hover': {
              color: TEXT('primary'),
              borderColor: 'var(--mui-palette-primary-main)',
              backgroundColor: 'var(--mui-palette-primary-lightOpacity)'
            }
          }
        },
        '.fc-dayGridMonth-button, .fc-timeGridWeek-button, .fc-timeGridDay-button, & .fc-listWeek-button': {
          padding: theme.spacing(2.2, 6),

          '&:last-of-type, &:first-of-type': {
            borderRadius: 'var(--mui-shape-borderRadius)'
          },
          '&:first-of-type': {
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0
          },
          '&:last-of-type': {
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0
          }
        }
      },
      '& .fc-today-button': {
        ...theme.typography.button,
        textTransform: 'none',
        padding: theme.spacing(1.5, 3),
        marginInlineStart: theme.spacing(2),
        color: TEXT('primary'),
        backgroundColor: 'transparent',
        borderColor: 'var(--mui-palette-primary-main)',
        '&:hover:not(:disabled)': {
          color: TEXT('primary'),
          borderColor: 'var(--mui-palette-primary-main)',
          backgroundColor: 'var(--mui-palette-primary-lightOpacity)'
        },
        '&:disabled': {
          color: TEXT('primary'),
          borderColor: 'var(--mui-palette-primary-main)',
          backgroundColor: 'transparent'
        }
      },
      '& > * > :not(:first-of-type)': {
        marginLeft: 0
      },
      '& .fc-toolbar-title': {
        marginInline: theme.spacing(4),
        ...theme.typography.h4
      },
      '.fc-button:empty, & .fc-toolbar-chunk:empty': {
        display: 'none'
      }
    },

    // Calendar head & body common
    '& tbody td, & thead th': {
      borderColor: 'var(--mui-palette-divider)',
      '&.fc-col-header-cell': {
        borderLeft: 0,
        borderRight: 0
      },
      '&[role="presentation"]': {
        borderInline: 0
      }
    },
    '& colgroup col': {
      width: '60px !important'
    },

    // Citas por estado
    '& .fc-event': {
      '& .fc-event-title-container, .fc-event-main-frame': {
        lineHeight: 1
      },
      '&.cita:not(.fc-list-event)': {
        cursor: 'pointer',
        '& .fc-event-title, & .fc-event-time': {
          fontSize: theme.typography.caption.fontSize,
          fontWeight: 500,
          padding: 0
        },
        '&.cita-pending': {
          border: 0,
          backgroundColor: 'var(--mui-palette-warning-lightOpacity)',
          '& .fc-event-title, & .fc-event-time': {
            color: TEXT('warning')
          }
        },
        '&.cita-confirmed': {
          border: 0,
          backgroundColor: 'var(--mui-palette-success-lightOpacity)',
          '& .fc-event-title, & .fc-event-time': {
            color: TEXT('success')
          }
        },
        '&.cita-in_progress': {
          border: 0,
          backgroundColor: 'var(--mui-palette-info-lightOpacity)',
          '& .fc-event-title, & .fc-event-time': {
            color: TEXT('info')
          }
        },
        '&.cita-completed': {
          border: 0,
          backgroundColor: 'var(--mui-palette-primary-lightOpacity)',
          '& .fc-event-title, & .fc-event-time': {
            color: TEXT('primary')
          }
        },
        '&.cita-cancelled': {
          border: 0,
          backgroundColor: 'var(--mui-palette-secondary-lightOpacity)',
          '& .fc-event-title, & .fc-event-time': {
            color: TEXT('secondary')
          }
        },
        '&.cita-no_show': {
          border: 0,
          backgroundColor: 'var(--mui-palette-error-lightOpacity)',
          '& .fc-event-title, & .fc-event-time': {
            color: TEXT('error')
          }
        },
        '&.fc-event-draggable': {
          cursor: 'grab'
        }
      },
      '&.cita-pending .fc-list-event-dot': {
        borderColor: 'var(--mui-palette-warning-main)'
      },
      '&.cita-confirmed .fc-list-event-dot': {
        borderColor: 'var(--mui-palette-success-main)'
      },
      '&.cita-in_progress .fc-list-event-dot': {
        borderColor: 'var(--mui-palette-info-main)'
      },
      '&.cita-completed .fc-list-event-dot': {
        borderColor: 'var(--mui-palette-primary-main)'
      },
      '&.cita-cancelled .fc-list-event-dot': {
        borderColor: 'var(--mui-palette-secondary-main)'
      },
      '&.cita-no_show .fc-list-event-dot': {
        borderColor: 'var(--mui-palette-error-main)'
      },
      '&.fc-daygrid-event': {
        margin: 0,
        borderRadius: '500px'
      }
    },

    // En la vista de mes el nombre del fondo va abajo, sin tapar el número del día.
    '& .fc-daygrid-bg-harness .fc-event-title': {
      position: 'absolute',
      insetBlockEnd: 0
    },

    // Fondos: cupos libres, bloqueos de agenda y feriados
    '& .fc-bg-event': {
      opacity: 1,
      '&.cupo-libre': {
        backgroundColor: 'transparent',
        border: '1px dashed var(--mui-palette-primary-main)'
      },
      '&.bloqueo': {
        backgroundColor: 'transparent',
        backgroundImage:
          'repeating-linear-gradient(45deg, var(--mui-palette-action-selected) 0 6px, transparent 6px 12px)'
      },
      '&.feriado': {
        backgroundColor: 'var(--mui-palette-info-lightOpacity)'
      },
      '& .fc-event-title': {
        ...theme.typography.caption,
        fontStyle: 'normal',
        color: 'var(--mui-palette-text-primary)',
        margin: theme.spacing(1)
      }
    },

    '& .fc-view-harness': {
      minHeight: '650px',
      margin: theme.spacing(0, -5.25)
    },

    // Calendar Head
    '& .fc-col-header': {
      '& .fc-col-header-cell-cushion': {
        ...theme.typography.body1,
        fontWeight: 500,
        color: 'var(--mui-palette-text-primary)',
        padding: theme.spacing(2),
        textDecoration: 'none !important'
      }
    },

    // Daygrid
    '& .fc-scrollgrid-section-liquid > td': {
      borderBottom: 0
    },
    '& .fc-daygrid-block-event .fc-event-time': {
      flexShrink: 0
    },
    '& .fc-daygrid-event-harness': {
      '& .fc-event': {
        padding: theme.spacing(1, 2)
      },
      '&:not(:last-of-type) .fc-event': {
        marginBottom: `${theme.spacing(2.5)} !important`
      }
    },
    '& .fc-daygrid-day-bottom': {
      marginTop: theme.spacing(2.5)
    },
    '& .fc-dayGridMonth-view .fc-daygrid-day': {
      padding: '8px',
      '& .fc-daygrid-day-top': {
        flexDirection: 'row'
      }
    },
    '& .fc-scrollgrid': {
      borderColor: 'var(--mui-palette-divider)',
      borderInline: 0
    },
    '& .fc-dayGridMonth-view .fc-daygrid-day-events': {
      marginTop: theme.spacing(2.5),
      minHeight: '5rem !important'
    },
    '& .fc-day-other .fc-daygrid-day-top': {
      opacity: 1,
      '& .fc-daygrid-day-number': {
        color: 'var(--mui-palette-text-secondary) !important'
      }
    },

    // All Views Event
    '& .fc-daygrid-day-number, & .fc-timegrid-slot-label-cushion, & .fc-list-event-time': {
      textDecoration: 'none !important'
    },
    '& .fc-daygrid-day-number': {
      color: 'var(--mui-palette-text-secondary) !important',
      padding: 0
    },
    '& .fc-timegrid-slot-label-cushion, & .fc-list-event-time': {
      color: 'var(--mui-palette-text-primary) !important'
    },
    '& .fc-day-today:not(.fc-popover)': {
      backgroundColor: 'var(--mui-palette-action-hover)'
    },

    // WeekView
    '& .fc-timegrid': {
      '& .fc-scrollgrid-section': {
        '& .fc-col-header-cell, & .fc-timegrid-axis': {
          borderLeft: 0,
          borderRight: 0,
          background: 'transparent',
          borderColor: 'var(--mui-palette-divider)'
        },
        '& .fc-timegrid-axis': {
          borderColor: 'var(--mui-palette-divider)'
        },
        '& .fc-timegrid-axis-frame': {
          justifyContent: 'center',
          padding: theme.spacing(1),
          alignItems: 'flex-start'
        },
        '&:has(.fc-timegrid-divider)': {
          height: 0
        }
      },
      '& .fc-timegrid-axis': {
        '&.fc-scrollgrid-shrink': {
          '& .fc-timegrid-axis-cushion': {
            ...theme.typography.caption,
            whiteSpace: 'normal',
            textAlign: 'center',
            padding: 0,
            color: 'var(--mui-palette-text-secondary)'
          }
        }
      },
      '& .fc-timegrid-slots': {
        '& .fc-timegrid-slot': {
          height: '3rem',
          borderColor: 'var(--mui-palette-divider)',
          '&.fc-timegrid-slot-label': {
            borderRight: 0,
            padding: theme.spacing(2),
            verticalAlign: 'top'
          },
          '&.fc-timegrid-slot-lane': {
            borderLeft: 0
          },
          '& .fc-timegrid-slot-label-frame': {
            textAlign: 'center',
            '& .fc-timegrid-slot-label-cushion': {
              display: 'block',
              padding: 0,
              ...theme.typography.body2,
              textTransform: 'uppercase'
            }
          }
        }
      },
      '& .fc-timegrid-divider': {
        display: 'none'
      },
      '& .fc-timegrid-event': {
        '& .fc-event-time': {
          ...theme.typography.caption,
          marginBlockEnd: 2
        },
        '& .fc-event-title': {
          lineHeight: 1.5385
        },
        boxShadow: 'none'
      },
      '.fc-timegrid-col-events': {
        margin: 0,
        '& .fc-event-main': {
          padding: theme.spacing(1)
        }
      }
    },
    '& .fc-timeGridWeek-view .fc-timegrid-slot-minor': {
      borderBlockStart: 0
    },

    // List View
    '& .fc-list': {
      border: 'none',
      '& th[colspan="3"]': {
        position: 'relative'
      },
      '& .fc-list-day-cushion': {
        background: 'transparent',
        padding: theme.spacing(2, 4)
      },
      '.fc-list-event': {
        cursor: 'pointer',
        '&:hover td': {
          backgroundColor: 'var(--mui-palette-action-hover)'
        },
        '& td': {
          borderColor: 'var(--mui-palette-divider)'
        }
      },
      '& .fc-list-event-graphic': {
        padding: theme.spacing(2)
      },
      '& .fc-list-day': {
        backgroundColor: 'var(--mui-palette-action-hover)',

        '& .fc-list-day-text, & .fc-list-day-side-text': {
          ...theme.typography.body1,
          fontWeight: 500,
          textDecoration: 'none'
        },

        '&  >  *': {
          background: 'none',
          borderColor: 'var(--mui-palette-divider)'
        }
      },
      '& .fc-list-event-title': {
        ...theme.typography.body1,
        color: 'var(--mui-palette-text-secondary) !important',
        padding: theme.spacing(2, 4, 2, 2)
      },
      '& .fc-list-event-time': {
        ...theme.typography.body1,
        color: 'var(--mui-palette-text-secondary) !important',
        padding: theme.spacing(2, 4)
      },
      '.fc-list-table tbody > tr:first-child th': {
        borderTop: '1px solid var(--mui-palette-divider)'
      },
      '.fc-list-table': {
        borderBottom: '1px solid var(--mui-palette-divider)'
      }
    },

    // Popover
    '& .fc-popover': {
      zIndex: 20,
      '[data-skin="bordered"] &': {
        boxShadow: 'none'
      },
      boxShadow: 1,
      borderColor: 'var(--mui-palette-divider)',
      borderRadius: 'var(--mui-shape-borderRadius)',
      background: 'var(--mui-palette-background-paper)',
      '& .fc-popover-header': {
        padding: theme.spacing(2),
        borderStartStartRadius: 'var(--mui-shape-borderRadius)',
        borderStartEndRadius: 'var(--mui-shape-borderRadius)',
        background: 'var(--mui-palette-action-hover)',
        '& .fc-popover-title, & .fc-popover-close': {
          color: 'var(--mui-palette-text-primary)'
        }
      }
    }
  }
}))

export default AppFullCalendar
